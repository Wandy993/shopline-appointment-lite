import { createHash, randomBytes } from 'node:crypto';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { slotKey, slotsForDate } from '../lib/slots.js';
import { sendBookingNotifications } from './email.js';
import { findInstalledShop } from './shops.js';

export class SlotConflictError extends Error { constructor() { super('This time was just booked. Please choose another slot.'); this.code = 'SLOT_CONFLICT'; } }

function accessError() {
  return Object.assign(new Error('Booking not found or management access has expired.'), { code: 'NOT_FOUND' });
}

export function hashManagementToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

function validManagementToken(token) {
  return /^[A-Za-z0-9_-]{43}$/.test(String(token || ''));
}

export async function createBookingAtomic({ shop, rule, input, BookingModel = Booking, notify = sendBookingNotifications }) {
  if (!rule.enabled || !slotsForDate(rule, input.date).includes(input.time)) throw Object.assign(new Error('The selected time is not available.'), { code: 'SLOT_UNAVAILABLE' });
  for (const question of rule.customQuestions || []) {
    if (question.required && !input.answers.find(answer => answer.question === question.label && answer.answer)) {
      throw Object.assign(new Error(`Please answer: ${question.label}`), { code: 'VALIDATION_ERROR' });
    }
  }
  let booking;
  const managementToken = randomBytes(32).toString('base64url');
  try {
    booking = await BookingModel.create({
      shopId: shop._id, ruleId: rule._id, productId: rule.productId, productTitle: rule.productTitle,
      date: input.date, time: input.time, slotKey: slotKey(input.date, input.time), duration: rule.duration,
      buffer: rule.buffer, timezone: shop.timezone || 'UTC', location: rule.location, staff: rule.staff,
      managementTokenHash: hashManagementToken(managementToken),
      customer: input.customer, note: input.note, answers: input.answers, status: 'confirmed'
    });
  } catch (error) {
    if (error?.code === 11000) throw new SlotConflictError();
    throw error;
  }
  Promise.resolve(notify(booking, shop.email)).catch(error => console.error('Email notification failed', error.message));
  return { booking, managementToken };
}

export async function createBookingForStore({ shopId, handle, productId, input }) {
  const shop = await findInstalledShop({ shopId, shop: handle });
  if (!shop) throw Object.assign(new Error('Store is not available.'), { code: 'NOT_FOUND' });
  const rule = await AppointmentRule.findOne({ shopId: shop._id, productId, enabled: true });
  if (!rule) throw Object.assign(new Error('Appointments are not enabled for this product.'), { code: 'NOT_FOUND' });
  return createBookingAtomic({ shop, rule, input });
}

export async function getManagedBooking({ bookingId, token, BookingModel = Booking }) {
  if (!validManagementToken(token)) throw accessError();
  const booking = await BookingModel.findOne({ _id: bookingId, managementTokenHash: hashManagementToken(token) });
  if (!booking) throw accessError();
  return booking;
}

export async function cancelManagedBooking({ bookingId, token, BookingModel = Booking }) {
  if (!validManagementToken(token)) throw accessError();
  const booking = await BookingModel.findOneAndUpdate(
    { _id: bookingId, managementTokenHash: hashManagementToken(token), status: 'confirmed' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );
  if (!booking) throw accessError();
  return booking;
}

export async function rescheduleManagedBooking({ bookingId, token, date, time, BookingModel = Booking, RuleModel = AppointmentRule }) {
  const booking = await getManagedBooking({ bookingId, token, BookingModel });
  if (booking.status !== 'confirmed') throw Object.assign(new Error('This appointment has already been cancelled.'), { status: 409, code: 'BOOKING_CANCELLED' });
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: booking.shopId, enabled: true });
  if (!rule || !slotsForDate(rule, date).includes(time)) {
    throw Object.assign(new Error('The selected time is not available.'), { code: 'VALIDATION_ERROR' });
  }
  let updated;
  try {
    updated = await BookingModel.findOneAndUpdate(
      { _id: booking._id, managementTokenHash: hashManagementToken(token), status: 'confirmed', slotKey: booking.slotKey },
      { date, time, slotKey: slotKey(date, time) },
      { new: true, runValidators: true }
    );
  } catch (error) {
    if (error?.code === 11000) throw new SlotConflictError();
    throw error;
  }
  if (!updated) throw Object.assign(new Error('This appointment changed in another session. Refresh and try again.'), { status: 409, code: 'BOOKING_CHANGED' });
  return updated;
}
