import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { addDays, filterSlotsByCapacity, futureSlotsForDate, zonedNow } from '../lib/slots.js';
import { validateBookingInput, validateDateInput, validateSlotInput } from '../lib/validation.js';
import { cancelManagedBooking, createBookingForStore, getLegacyBookingStatus, getManagedAvailability, getManagedBooking, rescheduleManagedBooking } from '../services/bookings.js';
import { findInstalledShop, validShopHandle, validShoplineStoreId } from '../services/shops.js';
import { normalizeEmailSettings } from '../lib/email-settings.js';

export const publicRouter = Router();
const bookingLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'RATE_LIMITED', message: 'Too many attempts. Please wait a minute.' } });

function validBookingId(value) { return /^[a-f\d]{24}$/i.test(String(value || '')); }
function validRuleId(value) { return mongoose.isValidObjectId(String(value || '')); }

function publicBooking(booking) {
  const customerRescheduleCount = Number(booking.customerRescheduleCount || 0);
  const timezone = booking.timezone || 'UTC';
  return {
    id: booking._id, serviceTitle: booking.productTitle, productTitle: booking.productTitle,
    bookingSource: booking.bookingSource || (booking.sourceType === 'standalone' ? 'direct' : 'product'),
    sourceType: booking.sourceType || 'product', serviceType: booking.serviceType === 'product' ? 'appointment' : (booking.serviceType || 'appointment'),
    date: booking.date, time: booking.time, timezone, storeDate: zonedNow(timezone).date,
    location: booking.location, staff: booking.staff, status: booking.status, customerRescheduleCount,
    customerCanReschedule: booking.status === 'confirmed' && customerRescheduleCount < 1
  };
}

function serializeRule(rule, timezone) {
  const storeDate = zonedNow(timezone).date;
  const bookingWindowDays = Number(rule.bookingWindowDays || 90);
  return {
    id: rule._id, bookingSource: rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product'),
    sourceType: rule.sourceType || 'product', serviceType: rule.serviceType === 'product' ? 'appointment' : (rule.serviceType || 'appointment'),
    productId: rule.productId || '', productTitle: rule.productTitle || '', serviceTitle: rule.serviceTitle || rule.productTitle,
    serviceDescription: rule.serviceDescription || '', duration: rule.duration, buffer: rule.buffer,
    capacity: Number(rule.capacity || 1), minimumNoticeMinutes: Number(rule.minimumNoticeMinutes || 0),
    bookingWindowDays, bookingWindowUntil: addDays(storeDate, bookingWindowDays),
    dateFrom: rule.dateFrom, dateUntil: rule.dateUntil, weeklyAvailability: rule.weeklyAvailability,
    availabilityExceptions: rule.availabilityExceptions || [], location: rule.location, staff: rule.staff,
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
  const timezone = result.shop.timezone || 'UTC';
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json({ rule: serializeRule(result.rule, timezone), timezone, storeDate: zonedNow(timezone).date });
});

publicRouter.get('/service', async (req, res) => {
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  const bookingSource = result.rule.bookingSource || (result.rule.sourceType === 'standalone' ? 'direct' : 'product');
  if (!['direct', 'both'].includes(bookingSource)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Direct booking is not enabled for this service.' });
  const timezone = result.shop.timezone || 'UTC';
  const emailSettings = normalizeEmailSettings(result.shop.emailSettings || {});
  res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
  res.json({
    rule: serializeRule(result.rule, timezone), timezone, storeDate: zonedNow(timezone).date,
    brand: { name: emailSettings.brandName || result.shop.handle || 'Appointment Lite', logoUrl: emailSettings.logoUrl || '', accentColor: emailSettings.accentColor || '#2F6FED' }
  });
});

publicRouter.get('/availability', async (req, res) => {
  const date = String(req.query.date || '');
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  const timezone = result.shop.timezone || 'UTC';
  const allSlots = futureSlotsForDate(result.rule, date, timezone);
  const booked = await Booking.find({ shopId: result.shop._id, ruleId: result.rule._id, date, status: 'confirmed' }).select('time').lean();
  res.set('Cache-Control', 'no-store');
  res.json({
    date, timezone, storeDate: zonedNow(timezone).date,
    slots: filterSlotsByCapacity(allSlots, booked, Number(result.rule.capacity || 1)),
    capacity: Number(result.rule.capacity || 1)
  });
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
