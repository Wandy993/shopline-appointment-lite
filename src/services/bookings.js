import { createHash, randomBytes } from 'node:crypto';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { futureSlotsForDate, slotKey } from '../lib/slots.js';
import { sendBookingCancelledNotification, sendBookingChangedNotification, sendBookingNotifications, sendCustomerRescheduledNotification } from './email.js';
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

export async function createBookingAtomic({ shop, rule, input, BookingModel = Booking, notify = sendBookingNotifications, now = new Date() }) {
  if (!rule.enabled || !futureSlotsForDate(rule, input.date, shop.timezone || 'UTC', now).includes(input.time)) throw Object.assign(new Error('The selected time is unavailable or has already passed in the store time zone.'), { code: 'SLOT_UNAVAILABLE' });
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
  Promise.resolve(notify(booking, shop.email, managementToken)).catch(error => console.error('Email notification failed', error.message));
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

export async function getLegacyBookingStatus({ bookingId, shopObjectId, productId, BookingModel = Booking }) {
  const booking = await BookingModel.findOne(
    { _id: bookingId, shopId: shopObjectId, productId },
    { _id: 1, status: 1 }
  );
  if (!booking) throw accessError();
  return { id: booking._id, status: booking.status };
}

export async function getManagedAvailability({ bookingId, token, date, BookingModel = Booking, RuleModel = AppointmentRule, now = new Date() }) {
  const booking = await getManagedBooking({ bookingId, token, BookingModel });
  if (booking.status !== 'confirmed') return { date, slots: [] };
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: booking.shopId, enabled: true });
  if (!rule) return { date, slots: [] };
  const allSlots = futureSlotsForDate(rule, date, booking.timezone || 'UTC', now);
  const booked = await BookingModel.find({ shopId: booking.shopId, ruleId: booking.ruleId, date, status: 'confirmed' }).distinct('time');
  return { date, slots: allSlots.filter(time => !booked.includes(time)) };
}

export async function cancelManagedBooking({ bookingId, token, BookingModel = Booking, notify = sendBookingCancelledNotification }) {
  if (!validManagementToken(token)) throw accessError();
  const booking = await BookingModel.findOneAndUpdate(
    { _id: bookingId, managementTokenHash: hashManagementToken(token), status: 'confirmed' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );
  if (!booking) throw accessError();
  Promise.resolve(notify(booking)).catch(error => console.error('Cancellation email notification failed', error.message));
  return booking;
}

export async function rescheduleManagedBooking({ bookingId, token, date, time, BookingModel = Booking, RuleModel = AppointmentRule, notify = sendCustomerRescheduledNotification, now = new Date() }) {
  const booking = await getManagedBooking({ bookingId, token, BookingModel });
  if (booking.status !== 'confirmed') throw Object.assign(new Error('This appointment has already been cancelled.'), { status: 409, code: 'BOOKING_CANCELLED' });
  if (Number(booking.customerRescheduleCount || 0) >= 1) {
    throw Object.assign(new Error('You have already used your online change. Please contact the store for another change.'), { status: 409, code: 'RESCHEDULE_LIMIT' });
  }
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: booking.shopId, enabled: true });
  if (!rule || !futureSlotsForDate(rule, date, booking.timezone || 'UTC', now).includes(time)) {
    throw Object.assign(new Error('The selected time is unavailable or has already passed in the store time zone.'), { code: 'VALIDATION_ERROR' });
  }
  let updated;
  try {
    updated = await BookingModel.findOneAndUpdate(
      { _id: booking._id, managementTokenHash: hashManagementToken(token), status: 'confirmed', slotKey: booking.slotKey, $or: [{ customerRescheduleCount: 0 }, { customerRescheduleCount: { $exists: false } }] },
      { $set: { date, time, slotKey: slotKey(date, time) }, $inc: { customerRescheduleCount: 1 } },
      { new: true, runValidators: true }
    );
  } catch (error) {
    if (error?.code === 11000) throw new SlotConflictError();
    throw error;
  }
  if (!updated) throw Object.assign(new Error('Your online change is no longer available. Please contact the store.'), { status: 409, code: 'RESCHEDULE_LIMIT' });
  Promise.resolve(notify(updated, token)).catch(error => console.error('Reschedule email notification failed', error.message));
  return updated;
}

export async function updateBookingByMerchant({ shopObjectId, bookingId, input, BookingModel = Booking, RuleModel = AppointmentRule, notify = sendBookingChangedNotification, now = new Date() }) {
  const booking = await BookingModel.findOne({ _id: bookingId, shopId: shopObjectId, status: 'confirmed' });
  if (!booking) throw Object.assign(new Error('Confirmed booking not found.'), { code: 'NOT_FOUND' });
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: shopObjectId, enabled: true });
  if (!rule || !futureSlotsForDate(rule, input.date, booking.timezone || 'UTC', now).includes(input.time)) {
    throw Object.assign(new Error('The selected date and time are outside this appointment rule or have already passed in the store time zone.'), { code: 'VALIDATION_ERROR' });
  }
  let updated;
  try {
    updated = await BookingModel.findOneAndUpdate(
      { _id: booking._id, shopId: shopObjectId, status: 'confirmed', slotKey: booking.slotKey },
      { $set: { date: input.date, time: input.time, slotKey: slotKey(input.date, input.time), location: input.location, staff: input.staff, merchantEditedAt: new Date() } },
      { new: true, runValidators: true }
    );
  } catch (error) {
    if (error?.code === 11000) throw new SlotConflictError();
    throw error;
  }
  if (!updated) throw Object.assign(new Error('This booking changed in another session. Refresh and try again.'), { status: 409, code: 'BOOKING_CHANGED' });
  const notification = await Promise.resolve(notify(updated)).catch(error => ({ skipped: false, attempted: 1, failed: 1, reason: error.message }));
  return { booking: updated, notification };
}

export async function cancelBookingByMerchant({ shopObjectId, bookingId, BookingModel = Booking, notify = sendBookingCancelledNotification }) {
  const booking = await BookingModel.findOneAndUpdate(
    { _id: bookingId, shopId: shopObjectId, status: 'confirmed' },
    { $set: { status: 'cancelled', cancelledAt: new Date() } },
    { new: true }
  );
  if (!booking) throw Object.assign(new Error('Confirmed booking not found.'), { code: 'NOT_FOUND' });
  const notification = await Promise.resolve(notify(booking)).catch(error => ({ skipped: false, attempted: 1, failed: 1, reason: error.message }));
  return { booking, notification };
}
