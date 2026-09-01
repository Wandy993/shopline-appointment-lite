import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { BookingReservation } from '../models/BookingReservation.js';
import { publicStaffDirectory, publicStaffOptions, staffAvailabilityForDate } from '../services/staffing.js';
import { addDays, bookingModeFor, filterSlotsByCapacity, futureSlotsForDate, isAllDayBookableDate, isDateAllowed, resolveRuleTimezone, slotsForDate, zonedNow } from '../lib/slots.js';
import { validateBookingInput, validateDateInput, validateSlotInput } from '../lib/validation.js';
import { cancelManagedBooking, createBookingForStore, createPaidBookingForStore, createPostPurchaseBookingForStore, getLegacyBookingStatus, getManagedAvailability, getManagedBooking, rescheduleManagedBooking } from '../services/bookings.js';
import { findInstalledShop, validShopHandle, validShoplineStoreId } from '../services/shops.js';
import { normalizeEmailSettings } from '../lib/email-settings.js';
import { normalizeStorefrontSettings } from '../lib/storefront-settings.js';
import { buildBookingIcs, calendarLinksForBooking, readBookingCalendarToken } from '../lib/calendar-links.js';
import { getPostPurchaseEntitlement, publicPostPurchaseEntitlement } from '../services/post-purchase.js';
import { TinyTtlCache, createSingleFlight } from '../lib/runtime-cache.js';
import { incrementOpsUsage, queueHealthEvent } from '../services/ops-hub.js';
import { publicSubscriptionUnavailable } from '../middleware/subscription.js';

export const publicRouter = Router();
const publicContextCache = new TinyTtlCache({ ttlMs: 4000, maxEntries: 300 });
const publicStaffCache = new TinyTtlCache({ ttlMs: 4000, maxEntries: 300 });
const runAvailabilitySingleFlight = createSingleFlight();
const bookingLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'RATE_LIMITED', message: 'Too many attempts. Please wait a minute.' } });

function validBookingId(value) { return /^[a-f\d]{24}$/i.test(String(value || '')); }
function validRuleId(value) { return mongoose.isValidObjectId(String(value || '')); }

async function opsShopForBookingInput(input = {}) {
  try {
    const ruleId = String(input.ruleId || '').trim();
    if (validRuleId(ruleId)) {
      const rule = await AppointmentRule.findById(ruleId).select('shopId').lean();
      if (rule?.shopId) return rule.shopId;
    }
    const shopId = String(input.shopId || '').trim();
    const handle = String(input.shop || '').trim().toLowerCase();
    if (validShoplineStoreId(shopId) || validShopHandle(handle)) {
      return await findInstalledShop({ shopId, handle });
    }
  } catch {}
  return null;
}

async function reportBookingCreateFailure(input, error) {
  const statusCode = Number(error?.status || error?.statusCode || 500);
  if (statusCode < 500) return;
  const shop = await opsShopForBookingInput(input);
  void queueHealthEvent('booking.create.failed', {
    shop, severity: 'error', category: 'booking',
    message: 'Booking creation failed before a customer confirmation was returned.',
    metadata: {
      statusCode,
      errorCode: String(error?.code || error?.name || 'BOOKING_CREATE_FAILED'),
      operation: 'booking_create'
    }
  });
}

function publicBooking(booking) {
  const customerRescheduleCount = Number(booking.customerRescheduleCount || 0);
  const timezone = booking.timezone || 'UTC';
  const bookingMode = ['slot', 'all_day', 'multi_slot'].includes(booking.bookingMode) ? booking.bookingMode : 'slot';
  const occurrences = Array.isArray(booking.occurrences) && booking.occurrences.length
    ? booking.occurrences.map(item => ({ date: item.date, time: item.time || '', staffId: item.staffId ? String(item.staffId) : '', staffName: item.staffName || '' }))
    : [{ date: booking.date, time: bookingMode === 'all_day' ? '' : booking.time }];
  return {
    id: booking._id, serviceTitle: booking.productTitle, productTitle: booking.productTitle,
    bookingType: booking.bookingType || (booking.commerceMode === 'product_post_purchase' ? 'purchase_triggered' : 'standalone'),
    paymentMode: booking.paymentMode || (booking.commerceMode === 'standalone_paid' ? 'checkout' : 'none'),
    bookingSource: booking.bookingSource || (booking.sourceType === 'standalone' ? 'direct' : 'product'),
    commerceMode: booking.commerceMode || ((booking.bookingSource || (booking.sourceType === 'standalone' ? 'direct' : 'product')) === 'direct' && !booking.productId ? 'standalone_free' : 'product_pre_purchase'),
    sourceType: booking.sourceType || 'product', serviceType: booking.serviceType === 'product' ? 'appointment' : (booking.serviceType || 'appointment'),
    bookingMode, occurrences,
    date: booking.date, time: bookingMode === 'all_day' ? '' : booking.time, timezone, storeDate: zonedNow(timezone).date,
    locationMode: booking.locationMode || 'custom', location: booking.location,
    meeting: booking.status === 'confirmed' && booking.onlineMeeting?.url ? { provider: booking.onlineMeeting.provider || 'custom', label: booking.onlineMeeting.label || '', url: booking.onlineMeeting.url } : null,
    staff: booking.staff, staffId: booking.staffId ? String(booking.staffId) : '', status: booking.status, customerRescheduleCount,
    customerCanReschedule: bookingMode === 'slot' && booking.status === 'confirmed' && customerRescheduleCount < 1,
    postPurchase: booking.postPurchase ? { orderId: booking.postPurchase.shoplineOrderId || '', orderName: booking.postPurchase.shoplineOrderName || '' } : null,
    calendar: booking.status === 'confirmed' ? calendarLinksForBooking(booking) : { google: '', ics: '' }
  };
}

function normalizedBookingModel(rule = {}) {
  const commerceMode = rule.commerceMode || ((rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product')) === 'direct' && !rule.productId ? 'standalone_free' : 'product_pre_purchase');
  return {
    bookingType: rule.bookingType || (commerceMode === 'product_post_purchase' ? 'purchase_triggered' : 'standalone'),
    paymentMode: rule.paymentMode || (commerceMode === 'standalone_paid' ? 'checkout' : 'none'),
    commerceMode
  };
}

function normalizedPlacement(rule = {}) {
  if (rule.storefrontPlacement) {
    return {
      directLink: rule.storefrontPlacement.directLink !== false,
      pageBlock: rule.storefrontPlacement.pageBlock !== false,
      staffDirectory: rule.storefrontPlacement.staffDirectory === true,
      productBlock: {
        enabled: rule.storefrontPlacement.productBlock?.enabled === true,
        scope: rule.storefrontPlacement.productBlock?.scope === 'selected' ? 'selected' : 'all',
        productIds: (rule.storefrontPlacement.productBlock?.productIds || []).map(String)
      },
      appEmbed: { enabled: rule.storefrontPlacement.appEmbed?.enabled === true }
    };
  }
  const bookingSource = rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product');
  const productEnabled = ['product', 'both'].includes(bookingSource) || rule.commerceMode === 'product_pre_purchase';
  const directEnabled = ['direct', 'both'].includes(bookingSource) && rule.commerceMode !== 'product_post_purchase';
  return {
    directLink: directEnabled,
    pageBlock: directEnabled,
    staffDirectory: false,
    productBlock: { enabled: productEnabled, scope: rule.productId ? 'selected' : 'all', productIds: rule.productId ? [String(rule.productId)] : [] },
    appEmbed: { enabled: false }
  };
}

function productPlacementAllows(rule, productId) {
  const placement = normalizedPlacement(rule).productBlock;
  if (!placement.enabled || !productId) return false;
  return placement.scope === 'all' || placement.productIds.includes(String(productId));
}

function serializeRule(rule, timezone, staffMeta = { mode: 'none', options: [] }) {
  const storeDate = zonedNow(timezone).date;
  const bookingWindowDays = Number(rule.bookingWindowDays || 90);
  const model = normalizedBookingModel(rule);
  const placement = normalizedPlacement(rule);
  return {
    id: rule._id,
    bookingType: model.bookingType,
    paymentMode: model.paymentMode,
    bookingSource: rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product'),
    commerceMode: model.commerceMode,
    sourceType: rule.sourceType || 'product', serviceType: rule.serviceType === 'product' ? 'appointment' : (rule.serviceType || 'appointment'),
    bookingMode: bookingModeFor(rule), sessionsRequired: Number(rule.sessionsRequired || 3), timezone,
    productId: rule.productId || '', productTitle: rule.productTitle || '', serviceTitle: rule.serviceTitle || rule.productTitle,
    serviceDescription: rule.serviceDescription || '', duration: rule.duration, buffer: rule.buffer,
    capacity: Number(rule.capacity || 1), minimumNoticeMinutes: Number(rule.minimumNoticeMinutes || 0),
    bookingWindowDays, bookingWindowUntil: addDays(storeDate, bookingWindowDays),
    dateFrom: rule.dateFrom, dateUntil: rule.dateUntil, weeklyAvailability: rule.weeklyAvailability,
    availabilityExceptions: rule.availabilityExceptions || [],
    locationMode: rule.locationMode || (rule.shoplineLocationId ? 'shopline_location' : (rule.location ? 'custom' : 'custom')),
    location: rule.location, shoplineLocationId: rule.shoplineLocationId || '',
    locationSnapshot: rule.locationSnapshot || null, staff: rule.staff,
    staffAssignment: { mode: staffMeta.mode, staffIds: staffMeta.options.map(item => item.id) }, staffOptions: staffMeta.options,
    payment: model.paymentMode === 'checkout' ? { required: true, holdMinutes: Number(rule.paymentHoldMinutes || 15), price: rule.checkoutProduct?.price || rule.productVariantPrice || '', variantTitle: rule.checkoutProduct?.variantTitle || rule.productVariantTitle || '' } : { required: false },
    postPurchaseRequired: model.bookingType === 'purchase_triggered',
    storefrontPlacement: placement,
    questionLabel: rule.questionLabel, customQuestions: rule.customQuestions
  };
}

function publicRuleCacheKey(req) {
  const ruleId = String(req.query.ruleId || '').trim();
  if (ruleId) return `rule:${ruleId}:${String(req.query.productId || '').trim()}`;
  const handle = String(req.query.shop || '').trim().toLowerCase();
  const shopId = String(req.query.shopId || '').trim();
  const productId = String(req.query.productId || '').trim();
  return `product:${shopId || handle}:${productId}`;
}

async function findPublicRule(req) {
  const cacheKey = publicRuleCacheKey(req);
  const cached = publicContextCache.get(cacheKey);
  if (cached) return cached;

  const ruleId = String(req.query.ruleId || '').trim();
  let result;
  if (ruleId) {
    if (!validRuleId(ruleId)) return { error: { status: 400, body: { error: 'INVALID_REQUEST', message: 'A valid ruleId is required.' } } };
    const rule = await AppointmentRule.findOne({ _id: ruleId, enabled: true }).lean();
    if (!rule) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'Appointment service not found.' } } };
    const requestedProductId = String(req.query.productId || '').trim();
    if (requestedProductId && !productPlacementAllows(rule, requestedProductId)) {
      return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'This appointment service is not enabled on this product.' } } };
    }
    const shop = await findInstalledShop({ objectId: rule.shopId });
    if (!shop) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'Store not found.' } } };
    if (publicSubscriptionUnavailable(shop)) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'Appointment service is temporarily unavailable.' } } };
    result = { rule, shop };
  } else {
    const handle = String(req.query.shop || '').toLowerCase();
    const shopId = String(req.query.shopId || '').trim();
    const productId = String(req.query.productId || '');
    if ((!validShoplineStoreId(shopId) && !validShopHandle(handle)) || !productId) return { error: { status: 400, body: { error: 'INVALID_REQUEST', message: 'shopId (or legacy shop) and productId are required.' } } };
    const shop = await findInstalledShop({ shopId, shop: handle });
    if (!shop) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'Store not found.' } } };
    if (publicSubscriptionUnavailable(shop)) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'Appointment service is temporarily unavailable.' } } };
    const candidates = await AppointmentRule.find({
      shopId: shop._id,
      enabled: true,
      $or: [
        { 'storefrontPlacement.productBlock.enabled': true },
        { productId, $or: [{ bookingSource: { $in: ['product', 'both'] } }, { bookingSource: { $exists: false }, sourceType: 'product' }] }
      ]
    }).sort({ updatedAt: -1 }).limit(50).lean();
    const rule = candidates.find(item => productPlacementAllows(item, productId) || (!item.storefrontPlacement && String(item.productId || '') === productId));
    if (!rule) return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'No appointment service is placed on this product.' } } };
    result = { rule, shop };
  }
  publicContextCache.set(cacheKey, result);
  return result;
}

async function cachedPublicStaffOptions(rule) {
  const key = String(rule?._id || '');
  const cached = publicStaffCache.get(key);
  if (cached) return cached;
  const value = await publicStaffOptions(rule);
  publicStaffCache.set(key, value);
  return value;
}


async function postPurchaseAccessForRequest(result, token) {
  if (result.rule.commerceMode !== 'product_post_purchase') return { required: false, entitlement: null };
  const entitlement = await getPostPurchaseEntitlement({ ruleId: result.rule._id, token: String(token || '') });
  if (!entitlement || String(entitlement.shopId) !== String(result.shop._id) || entitlement.status === 'revoked' || entitlement.status === 'pending_payment') {
    return { error: { status: 404, body: { error: 'NOT_FOUND', message: 'This private scheduling link is invalid or no longer available.' } } };
  }
  const remaining = Math.max(0, Number(entitlement.eligibleQuantity || 0) - Number(entitlement.usedBookings || 0));
  if (remaining < 1 || entitlement.status === 'exhausted') {
    return { error: { status: 409, body: { error: 'POST_PURCHASE_EXHAUSTED', message: 'All appointments included with this order have already been scheduled.' } } };
  }
  return { required: true, entitlement };
}

publicRouter.get('/rule', async (req, res) => {
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  const timezone = resolveRuleTimezone(result.rule, result.shop.timezone || 'UTC');
  const staffMeta = await cachedPublicStaffOptions(result.rule);
  res.set('Cache-Control', 'no-cache');
  res.json({ rule: serializeRule(result.rule, timezone, staffMeta), storefront: normalizeStorefrontSettings(result.shop.storefrontSettings || {}), timezone, storeDate: zonedNow(timezone).date });
});

publicRouter.get('/staff-directory', async (req, res) => {
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  if (req.query.placement === 'staff_directory' && !normalizedPlacement(result.rule).staffDirectory) return res.status(404).json({ error: 'NOT_FOUND', message: 'Staff Directory placement is not enabled for this service.' });
  const directory = await publicStaffDirectory(result.rule);
  res.set('Cache-Control', 'no-cache');
  res.json({
    service: { id: String(result.rule._id), title: result.rule.serviceTitle || result.rule.productTitle || 'Appointment', description: result.rule.serviceDescription || '' },
    staff: directory.options
  });
});

publicRouter.get('/embed-services', async (req, res) => {
  const handle = String(req.query.shop || '').toLowerCase();
  const shopId = String(req.query.shopId || '').trim();
  if (!validShoplineStoreId(shopId) && !validShopHandle(handle)) return res.status(400).json({ error: 'INVALID_REQUEST', message: 'shopId or shop is required.' });
  const shop = await findInstalledShop({ shopId, shop: handle });
  if (!shop || publicSubscriptionUnavailable(shop)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Appointment services are unavailable.' });
  const rules = await AppointmentRule.find({ shopId: shop._id, enabled: true, bookingType: { $ne: 'purchase_triggered' }, 'storefrontPlacement.appEmbed.enabled': true })
    .sort({ serviceTitle: 1 }).select('_id serviceTitle serviceDescription serviceType').lean();
  const storefront = normalizeStorefrontSettings(shop.storefrontSettings || {});
  res.set('Cache-Control', 'no-cache');
  res.json({
    services: rules.map(rule => ({ id: String(rule._id), title: rule.serviceTitle || 'Appointment', description: rule.serviceDescription || '', serviceType: rule.serviceType || 'appointment' })),
    storefront
  });
});

publicRouter.get('/service', async (req, res) => {
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  if (req.query.placement === 'page' && !normalizedPlacement(result.rule).pageBlock) return res.status(404).json({ error: 'NOT_FOUND', message: 'Regular page placement is not enabled for this service.' });
  const access = await postPurchaseAccessForRequest(result, req.query.access);
  if (access.error) return res.status(access.error.status).json(access.error.body);
  const timezone = resolveRuleTimezone(result.rule, result.shop.timezone || 'UTC');
  const emailSettings = normalizeEmailSettings(result.shop.emailSettings || {});
  const staffMeta = await cachedPublicStaffOptions(result.rule);
  res.set('Cache-Control', result.rule.commerceMode === 'product_post_purchase' ? 'no-store' : 'no-cache');
  res.json({
    rule: serializeRule(result.rule, timezone, staffMeta), storefront: normalizeStorefrontSettings(result.shop.storefrontSettings || {}), timezone, storeDate: zonedNow(timezone).date,
    postPurchase: access.entitlement ? publicPostPurchaseEntitlement(access.entitlement) : null,
    brand: { name: emailSettings.brandName || result.shop.handle || 'Appointment Lite', logoUrl: emailSettings.logoUrl || '', accentColor: emailSettings.accentColor || '#2F6FED' }
  });
});

async function computeAvailabilityPayload({ result, date, requestedStaffId, selectedOccurrences }) {
  const timezone = resolveRuleTimezone(result.rule, result.shop.timezone || 'UTC');
  const mode = bookingModeFor(result.rule);
  const capacity = Number(result.rule.capacity || 1);
  const [reservations, bookingRows] = await Promise.all([
    BookingReservation.find({ shopId: result.shop._id, ruleId: result.rule._id, date }).select('bookingId time slotPosition').lean(),
    Booking.find({ shopId: result.shop._id, ruleId: result.rule._id, date, status: 'confirmed', adminDeletedAt: null }).select('_id time slotPosition').lean()
  ]);
  const reservedBookingIds = new Set(reservations.map(item => String(item.bookingId || '')).filter(Boolean));
  const legacyBookings = bookingRows.filter(item => !reservedBookingIds.has(String(item._id)));
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
    return {
      date, timezone, storeDate: zonedNow(timezone).date, bookingMode: mode,
      available, remaining: Math.max(0, capacity - count), capacity, slots: [], reason,
      requiresStaffSelection: staffing.requiresStaffSelection || false
    };
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
  return {
    date, timezone, storeDate: zonedNow(timezone).date, bookingMode: mode,
    slots: finalSlots, capacity, reason,
    requiresStaffSelection: staffing.requiresStaffSelection || false
  };
}

publicRouter.get('/availability', async (req, res) => {
  const startedAt = performance.now();
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Choose a valid appointment date.' });
  const result = await findPublicRule(req);
  if (result.error) return res.status(result.error.status).json(result.error.body);
  void incrementOpsUsage(result.shop, 'app_api_availability_requests', 1);
  const access = await postPurchaseAccessForRequest(result, req.query.access);
  if (access.error) return res.status(access.error.status).json(access.error.body);
  const requestedStaffId = String(req.query.staffId || '').trim();
  const selectedOccurrences = String(req.query.selected || '').split(',').map(value => value.trim()).filter(Boolean).slice(0, 12).map(value => {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})T([0-2]\d:[0-5]\d)$/);
    return match ? { date: match[1], time: match[2], slotKey: `${match[1]}T${match[2]}` } : null;
  }).filter(Boolean);
  const flightKey = [String(result.rule._id), date, requestedStaffId, selectedOccurrences.map(item => item.slotKey).sort().join(','), access.required ? String(access.entitlement?._id || '') : 'public'].join('|');
  const payload = await runAvailabilitySingleFlight(flightKey, () => computeAvailabilityPayload({ result, date, requestedStaffId, selectedOccurrences }));
  const elapsed = Math.max(0, performance.now() - startedAt);
  if (elapsed >= 1500) {
    const durationMs = Math.round(elapsed);
    console.warn('Slow storefront availability request', { ruleId: String(result.rule._id), date, staffId: requestedStaffId || '', durationMs });
    void incrementOpsUsage(result.shop, 'health_slow_availability_requests', 1);
    void queueHealthEvent('availability.slow', {
      shop: result.shop, severity: 'warning', category: 'performance',
      message: 'Storefront availability exceeded the 1500 ms warning threshold.',
      metadata: { durationMs, ruleId: String(result.rule._id), date, operation: 'availability' }
    });
  }
  res.set({
    'Cache-Control': 'no-store',
    'Server-Timing': `availability;dur=${elapsed.toFixed(1)}`,
    'X-Appointment-Availability-Ms': String(Math.round(elapsed))
  });
  res.json(payload);
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
    void incrementOpsUsage(result.booking.shopId, 'app_api_booking_requests', 1);
    void incrementOpsUsage(result.booking.shopId, 'business_bookings_created', 1);
    res.status(201).json({
      booking: {
        ...publicBooking(result.booking),
        holdExpiresAt: result.holdExpiresAt,
        managementToken: ''
      },
      checkoutUrl: result.checkoutUrl
    });
  } catch (error) {
    await reportBookingCreateFailure(req.body, error);
    next(error);
  }
});


publicRouter.post('/post-purchase-bookings', bookingLimiter, async (req, res, next) => {
  try {
    const { errors, value } = validateBookingInput(req.body);
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const entitlementToken = String(req.body.entitlementToken || '').trim();
    const { booking, managementToken, remainingBookings } = await createPostPurchaseBookingForStore({ ruleId: value.ruleId, entitlementToken, input: value });
    void incrementOpsUsage(booking.shopId, 'app_api_booking_requests', 1);
    void incrementOpsUsage(booking.shopId, 'business_bookings_created', 1);
    res.status(201).json({ booking: { ...publicBooking(booking), managementToken }, remainingBookings });
  } catch (error) {
    await reportBookingCreateFailure(req.body, error);
    next(error);
  }
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
    void incrementOpsUsage(booking.shopId, 'app_api_booking_requests', 1);
    void incrementOpsUsage(booking.shopId, 'business_bookings_created', 1);
    res.status(201).json({ booking: { ...publicBooking(booking), managementToken } });
  } catch (error) {
    await reportBookingCreateFailure(req.body, error);
    next(error);
  }
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
    void incrementOpsUsage(booking.shopId, 'business_bookings_cancelled', 1);
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
    void incrementOpsUsage(booking.shopId, 'business_bookings_rescheduled', 1);
    res.set('Cache-Control', 'no-store');
    res.json({ booking: publicBooking(booking) });
  } catch (error) { next(error); }
});
