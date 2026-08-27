import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { BookingReservation } from '../models/BookingReservation.js';
import { publicStaffOptions, staffAvailabilityForDate } from '../services/staffing.js';
import { addDays, bookingModeFor, filterSlotsByCapacity, futureSlotsForDate, isAllDayBookableDate, isDateAllowed, resolveRuleTimezone, slotsForDate, zonedNow } from '../lib/slots.js';
import { validateBookingInput, validateDateInput, validateSlotInput } from '../lib/validation.js';
import { cancelManagedBooking, createBookingForStore, createPaidBookingForStore, getLegacyBookingStatus, getManagedAvailability, getManagedBooking, rescheduleManagedBooking } from '../services/bookings.js';
import { findInstalledShop, validShopHandle, validShoplineStoreId } from '../services/shops.js';
import { normalizeEmailSettings } from '../lib/email-settings.js';
import { buildBookingIcs, calendarLinksForBooking, readBookingCalendarToken } from '../lib/calendar-links.js';

export const publicRouter = Router();
const bookingLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'RATE_LIMITED', message: 'Too many attempts. Please wait a minute.' } });

function validBookingId(value) { return /^[a-f\d]{24}$/i.test(String(value || '')); }
function validRuleId(value) { return mongoose.isValidObjectId(String(value || '')); }

function publicBooking(booking) {
  const customerRescheduleCount = Number(booking.customerRescheduleCount || 0);
  const timezone = booking.timezone || 'UTC';
  const bookingMode = ['slot', 'all_day', 'multi_slot'].includes(booking.bookingMode) ? booking.bookingMode : 'slot';
  const occurrences = Array.isArray(booking.occurrences) && booking.occurrences.length
    ? booking.occurrences.map(item => ({ date: item.date, time: item.time || '', staffId: item.staffId ? String(item.staffId) : '', staffName: item.staffName || '' }))
    : [{ date: booking.date, time: bookingMode === 'all_day' ? '' : booking.time }];
  return {
    id: booking._id, serviceTitle: booking.productTitle, productTitle: booking.productTitle,
    bookingSource: booking.bookingSource || (booking.sourceType === 'standalone' ? 'direct' : 'product'),
    commerceMode: booking.commerceMode || ((booking.bookingSource || (booking.sourceType === 'standalone' ? 'direct' : 'product')) === 'direct' && !booking.productId ? 'standalone_free' : 'product_pre_purchase'),
    sourceType: booking.sourceType || 'product', serviceType: booking.serviceType === 'product' ? 'appointment' : (booking.serviceType || 'appointment'),
    bookingMode, occurrences,
    date: booking.date, time: bookingMode === 'all_day' ? '' : booking.time, timezone, storeDate: zonedNow(timezone).date,
    location: booking.location, staff: booking.staff, staffId: booking.staffId ? String(booking.staffId) : '', status: booking.status, customerRescheduleCount,
    customerCanReschedule: bookingMode === 'slot' && booking.status === 'confirmed' && customerRescheduleCount < 1,
    calendar: booking.status === 'confirmed' ? calendarLinksForBooking(booking) : { google: '', ics: '' }
  };
}

function serializeRule(rule, timezone, staffMeta = { mode: 'none', options: [] }) {
  const storeDate = zonedNow(timezone).date;
  const bookingWindowDays = Number(rule.bookingWindowDays || 90);
  return {
    id: rule._id, bookingSource: rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product'),
    commerceMode: rule.commerceMode || ((rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product')) === 'direct' && !rule.productId ? 'standalone_free' : 'product_pre_purchase'),
    sourceType: rule.sourceType || 'product', serviceType: rule.serviceType === 'product' ? 'appointment' : (rule.serviceType || 'appointment'),
    bookingMode: bookingModeFor(rule), sessionsRequired: Number(rule.sessionsRequired || 3), timezone,
    productId: rule.productId || '', productTitle: rule.productTitle || '', serviceTitle: rule.serviceTitle || rule.productTitle,
    serviceDescription: rule.serviceDescription || '', duration: rule.duration, buffer: rule.buffer,
    capacity: Number(rule.capacity || 1), minimumNoticeMinutes: Number(rule.minimumNoticeMinutes || 0),
    bookingWindowDays, bookingWindowUntil: addDays(storeDate, bookingWindowDays),
    dateFrom: rule.dateFrom, dateUntil: rule.dateUntil, weeklyAvailability: rule.weeklyAvailability,
    availabilityExceptions: rule.availabilityExceptions || [], location: rule.location, staff: rule.staff,
    staffAssignment: { mode: staffMeta.mode, staffIds: staffMeta.options.map(item => item.id) }, staffOptions: staffMeta.options,
    payment: rule.commerceMode === 'standalone_paid' ? { required: true, holdMinutes: Number(rule.paymentHoldMinutes || 15), price: rule.productVariantPrice || '', variantTitle: rule.productVariantTitle || '' } : { required: false },
    questionLabel: rule.questionLabel, customQuestions: rule.customQuestions
  };
}

async function findPublicRule(req) {
  const ruleId = String(req.query.ruleId || '').trim();
  if (ruleId) {
    if (!validRuleId(ruleId)) return { error: { status: 400, body: { error: 'INVALID_REQUEST', message: 'A valid ruleId is required.' } } };
    const rule = await AppointmentRule.findOne({ _id: ruleId, enabled: true }).lean();
    if (!rule) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'Appointment service not found.' } } };
    const shop = await findInstalledShop({ objectId: rule.shopId });
    if (!shop) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'Store not found.' } } };
    return { rule, shop };
  }

  const handle = String(req.query.shop || '').toLowerCase();
  const shopId = String(req.query.shopId || '').trim();
  const productId = String(req.query.productId || '');
  if ((!validShoplineStoreId(shopId) && !validShopHandle(handle)) || !productId) return { error: { status: 400, body: { error: 'INVALID_REQUEST', message: 'shopId (or legacy shop) and productId are required.' } } };
  const shop = await findInstalledShop({ shopId, shop: handle });
  if (!shop) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'Store not found.' } } };
  const rule = await AppointmentRule.findOne({ shopId: shop._id, productId, enabled: true, $or: [{ bookingSource: { $in: ['product', 'both'] } }, { bookingSource: { $exists: false }, sourceType: 'product' }] }).lean();
  if (!rule) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'No appointment rule for this product.' } } };
  return { rule, shop };
}

publicRouter.get('/rule', async (req, res) => {
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  const timezone = resolveRuleTimezone(result.rule, result.shop.timezone || 'UTC');
  const staffMeta = await publicStaffOptions(result.rule);
  res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
  res.json({ rule: serializeRule(result.rule, timezone, staffMeta), timezone, storeDate: zonedNow(timezone).date });
});

publicRouter.get('/service', async (req, res) => {
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  const bookingSource = result.rule.bookingSource || (result.rule.sourceType === 'standalone' ? 'direct' : 'product');
  if (!['direct', 'both'].includes(bookingSource)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Direct booking is not enabled for this service.' });
  const timezone = resolveRuleTimezone(result.rule, result.shop.timezone || 'UTC');
  const emailSettings = normalizeEmailSettings(result.shop.emailSettings || {});
  const staffMeta = await publicStaffOptions(result.rule);
  res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
  res.json({
    rule: serializeRule(result.rule, timezone, staffMeta), timezone, storeDate: zonedNow(timezone).date,
    brand: { name: emailSettings.brandName || result.shop.handle || 'Appointment Lite', logoUrl: emailSettings.logoUrl || '', accentColor: emailSettings.accentColor || '#2F6FED' }
  });
});

publicRouter.get('/availability', async (req, res) => {
  const date = String(req.query.date || '');
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  const timezone = resolveRuleTimezone(result.rule, result.shop.timezone || 'UTC');
  const mode = bookingModeFor(result.rule);
  const capacity = Number(result.rule.capacity || 1);
  const requestedStaffId = String(req.query.staffId || '').trim();
  const selectedOccurrences = String(req.query.selected || '').split(',').map(value => value.trim()).filter(Boolean).slice(0, 12).map(value => {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})T([0-2]\d:[0-5]\d)$/);
    return match ? { date: match[1], time: match[2], slotKey: `${match[1]}T${match[2]}` } : null;
  }).filter(Boolean);
  const reservations = await BookingReservation.find({ shopId: result.shop._id, ruleId: result.rule._id, date }).select('bookingId time slotPosition').lean();
  const reservedBookingIds = reservations.map(item => item.bookingId).filter(Boolean);
  const legacyFilter = { shopId: result.shop._id, ruleId: result.rule._id, date, status: 'confirmed' };
  if (reservedBookingIds.length) legacyFilter._id = { $nin: reservedBookingIds };
  const legacyBookings = await Booking.find(legacyFilter).select('time slotPosition').lean();
  res.set('Cache-Control', 'no-store');
  if (mode === 'all_day') {
    const count = reservations.length + legacyBookings.length;
    const serviceOpen = isDateAllowed(result.rule, date);
    const withinPolicy = serviceOpen && isAllDayBookableDate(result.rule, date, timezone);
    const hasCapacity = count < capacity;
    const baseAvailable = withinPolicy && hasCapacity;
    const staffing = baseAvailable
      ? await staffAvailabilityForDate({ shopId: result.shop._id, rule: result.rule, date, requestedStaffId, selectedOccurrences })
      : { managed: false, requiresStaffSelection: false, availableAllDay: false };
    const available = baseAvailable && staffing.availableAllDay;
    let reason = '';
    if (!serviceOpen) reason = 'SERVICE_CLOSED';
    else if (!withinPolicy) reason = 'POLICY_BLOCKED';
    else if (!hasCapacity) reason = 'CAPACITY_FULL';
    else if (staffing.requiresStaffSelection) reason = 'STAFF_SELECTION_REQUIRED';
    else if (staffing.managed && !staffing.availableAllDay) reason = 'STAFF_UNAVAILABLE';
    return res.json({
      date, timezone, storeDate: zonedNow(timezone).date, bookingMode: mode,
      available, remaining: Math.max(0, capacity - count), capacity, slots: [], reason,
      requiresStaffSelection: staffing.requiresStaffSelection || false
    });
  }
  const serviceSlots = slotsForDate(result.rule, date);
  const allSlots = futureSlotsForDate(result.rule, date, timezone);
  const booked = [...reservations.map(item => ({ time: item.time })), ...legacyBookings];
  const capacitySlots = filterSlotsByCapacity(allSlots, booked, capacity);
  const staffing = await staffAvailabilityForDate({ shopId: result.shop._id, rule: result.rule, date, baseSlots: capacitySlots, requestedStaffId, selectedOccurrences });
  const finalSlots = staffing.managed ? staffing.slots : capacitySlots;
  let reason = '';
  if (!serviceSlots.length) reason = 'SERVICE_CLOSED';
  else if (!allSlots.length) reason = 'POLICY_BLOCKED';
  else if (!capacitySlots.length) reason = 'CAPACITY_FULL';
  else if (staffing.requiresStaffSelection) reason = 'STAFF_SELECTION_REQUIRED';
  else if (staffing.managed && !finalSlots.length) reason = 'STAFF_UNAVAILABLE';
  res.json({
    date, timezone, storeDate: zonedNow(timezone).date, bookingMode: mode,
    slots: finalSlots, capacity, reason,
    requiresStaffSelection: staffing.requiresStaffSelection || false
  });
});



publicRouter.get('/bookings/:id/calendar.ics', async (req, res) => {
  if (!validBookingId(req.params.id)) return res.status(404).type('text/plain').send('Calendar file not found.');
  const access = readBookingCalendarToken(req.query.token);
  if (!access || String(access.bookingId) !== String(req.params.id)) return res.status(404).type('text/plain').send('Calendar file not found.');
  const booking = await Booking.findById(req.params.id).lean();
  if (!booking) return res.status(404).type('text/plain').send('Calendar file not found.');
  const safeName = String(booking.productTitle || 'appointment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'appointment';
  res.set({
    'Cache-Control': 'no-store',
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': `attachment; filename="${safeName}.ics"`
  });
  res.send(buildBookingIcs(booking));
});

publicRouter.post('/paid-bookings', bookingLimiter, async (req, res, next) => {
  try {
    const handle = String(req.body.shop || '').toLowerCase();
    const shopId = String(req.body.shopId || '').trim();
    const { errors, value } = validateBookingInput(req.body);
    const standalone = Boolean(value.ruleId);
    if (standalone && !validRuleId(value.ruleId)) errors.push('A valid appointment service is required.');
    if (!standalone && !validShoplineStoreId(shopId) && !validShopHandle(handle)) errors.push('Invalid shop identity.');
    if (!standalone && !value.productId) errors.push('Product is required.');
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const result = await createPaidBookingForStore({ shopId, handle, productId: value.productId, ruleId: value.ruleId, input: value });
    res.status(201).json({
      booking: {
        ...publicBooking(result.booking),
        holdExpiresAt: result.holdExpiresAt,
        managementToken: ''
      },
      checkoutUrl: result.checkoutUrl
    });
  } catch (error) { next(error); }
});

publicRouter.post('/bookings', bookingLimiter, async (req, res, next) => {
  try {
    const handle = String(req.body.shop || '').toLowerCase();
    const shopId = String(req.body.shopId || '').trim();
    const { errors, value } = validateBookingInput(req.body);
    const standalone = Boolean(value.ruleId);
    if (standalone && !validRuleId(value.ruleId)) errors.push('A valid appointment service is required.');
    if (!standalone && !validShoplineStoreId(shopId) && !validShopHandle(handle)) errors.push('Invalid shop identity.');
    if (!standalone && !value.productId) errors.push('Product is required.');
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const { booking, managementToken } = await createBookingForStore({ shopId, handle, productId: value.productId, ruleId: value.ruleId, input: value });
    res.status(201).json({ booking: { ...publicBooking(booking), managementToken } });
  } catch (error) { next(error); }
});

publicRouter.post('/bookings/:id/status', bookingLimiter, async (req, res, next) => {
  try {
    if (!validBookingId(req.params.id)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found or management access has expired.' });
    res.set('Cache-Control', 'no-store');
    if (req.body.managementToken) {
      const booking = await getManagedBooking({ bookingId: req.params.id, token: req.body.managementToken });
      return res.json({ booking: publicBooking(booking) });
    }
    const shopId = String(req.body.shopId || '').trim();
    const productId = String(req.body.productId || '').trim();
    if (!validShoplineStoreId(shopId) || !productId) return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found.' });
    const shop = await findInstalledShop({ shopId });
    if (!shop) return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found.' });
    const booking = await getLegacyBookingStatus({ bookingId: req.params.id, shopObjectId: shop._id, productId });
    res.json({ booking });
  } catch (error) { next(error); }
});

publicRouter.post('/bookings/:id/availability', bookingLimiter, async (req, res, next) => {
  try {
    if (!validBookingId(req.params.id)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found or management access has expired.' });
    const { errors, value } = validateDateInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const availability = await getManagedAvailability({ bookingId: req.params.id, token: req.body.managementToken, date: value.date });
    res.set('Cache-Control', 'no-store');
    res.json(availability);
  } catch (error) { next(error); }
});

publicRouter.post('/bookings/:id/cancel', bookingLimiter, async (req, res, next) => {
  try {
    if (!validBookingId(req.params.id)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found or management access has expired.' });
    const booking = await cancelManagedBooking({ bookingId: req.params.id, token: req.body.managementToken });
    res.set('Cache-Control', 'no-store');
    res.json({ booking: publicBooking(booking) });
  } catch (error) { next(error); }
});

publicRouter.post('/bookings/:id/reschedule', bookingLimiter, async (req, res, next) => {
  try {
    if (!validBookingId(req.params.id)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found or management access has expired.' });
    const { errors, value } = validateSlotInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const booking = await rescheduleManagedBooking({ bookingId: req.params.id, token: req.body.managementToken, date: value.date, time: value.time });
    res.set('Cache-Control', 'no-store');
    res.json({ booking: publicBooking(booking) });
  } catch (error) { next(error); }
});
