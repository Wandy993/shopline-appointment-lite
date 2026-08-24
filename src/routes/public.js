import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { slotsForDate } from '../lib/slots.js';
import { validateBookingInput, validateSlotInput } from '../lib/validation.js';
import { cancelManagedBooking, createBookingForStore, getManagedBooking, rescheduleManagedBooking } from '../services/bookings.js';
import { findInstalledShop, validShopHandle, validShoplineStoreId } from '../services/shops.js';

export const publicRouter = Router();
const bookingLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'RATE_LIMITED', message: 'Too many attempts. Please wait a minute.' } });

function validBookingId(value) { return /^[a-f\d]{24}$/i.test(String(value || '')); }
function publicBooking(booking) {
  return { id: booking._id, productTitle: booking.productTitle, date: booking.date, time: booking.time, location: booking.location, staff: booking.staff, status: booking.status };
}

publicRouter.get('/rule', async (req, res) => {
  const handle = String(req.query.shop || '').toLowerCase();
  const shopId = String(req.query.shopId || '').trim();
  const productId = String(req.query.productId || '');
  if ((!validShoplineStoreId(shopId) && !validShopHandle(handle)) || !productId) return res.status(400).json({ error: 'INVALID_REQUEST', message: 'shopId (or legacy shop) and productId are required.' });
  const shop = await findInstalledShop({ shopId, shop: handle });
  if (!shop) return res.status(404).json({ error: 'NOT_FOUND', message: 'Store not found.' });
  const rule = await AppointmentRule.findOne({ shopId: shop._id, productId, enabled: true }).lean();
  if (!rule) return res.status(404).json({ error: 'NOT_FOUND', message: 'No appointment rule for this product.' });
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json({ rule: {
    id: rule._id, productId: rule.productId, productTitle: rule.productTitle, duration: rule.duration, buffer: rule.buffer,
    dateFrom: rule.dateFrom, dateUntil: rule.dateUntil, weeklyAvailability: rule.weeklyAvailability,
    location: rule.location, staff: rule.staff, questionLabel: rule.questionLabel, customQuestions: rule.customQuestions
  }, timezone: shop.timezone || 'UTC' });
});

publicRouter.get('/availability', async (req, res) => {
  const handle = String(req.query.shop || '').toLowerCase();
  const shopId = String(req.query.shopId || '').trim();
  const productId = String(req.query.productId || '');
  const date = String(req.query.date || '');
  const shop = await findInstalledShop({ shopId, shop: handle });
  if (!shop) return res.status(404).json({ error: 'NOT_FOUND', message: 'Store not found.' });
  const rule = await AppointmentRule.findOne({ shopId: shop._id, productId, enabled: true }).lean();
  if (!rule) return res.status(404).json({ error: 'NOT_FOUND', message: 'Appointment rule not found.' });
  const allSlots = slotsForDate(rule, date);
  const booked = await Booking.find({ shopId: shop._id, ruleId: rule._id, date, status: 'confirmed' }).distinct('time');
  res.set('Cache-Control', 'no-store');
  res.json({ date, slots: allSlots.filter(time => !booked.includes(time)) });
});

publicRouter.post('/bookings', bookingLimiter, async (req, res, next) => {
  try {
    const handle = String(req.body.shop || '').toLowerCase();
    const shopId = String(req.body.shopId || '').trim();
    const { errors, value } = validateBookingInput(req.body);
    if (!validShoplineStoreId(shopId) && !validShopHandle(handle)) errors.push('Invalid shop identity.');
    if (!value.productId) errors.push('Product is required.');
    if (errors.length) return res.status(422).json({ error: 'VALIDATION_ERROR', message: errors.join(' '), fields: errors });
    const { booking, managementToken } = await createBookingForStore({ shopId, handle, productId: value.productId, input: value });
    res.status(201).json({ booking: { ...publicBooking(booking), managementToken } });
  } catch (error) { next(error); }
});

publicRouter.post('/bookings/:id/status', bookingLimiter, async (req, res, next) => {
  try {
    if (!validBookingId(req.params.id)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found or management access has expired.' });
    const booking = await getManagedBooking({ bookingId: req.params.id, token: req.body.managementToken });
    res.set('Cache-Control', 'no-store');
    res.json({ booking: publicBooking(booking) });
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
