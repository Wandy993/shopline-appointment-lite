import { createHash, randomBytes } from 'node:crypto';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { filterSlotsByCapacity, futureSlotsForDate, slotKey } from '../lib/slots.js';
import { sendBookingCancelledNotification, sendBookingChangedNotification, sendBookingNotifications, sendCustomerRescheduledNotification } from './email.js';
import { findInstalledShop } from './shops.js';

export class SlotConflictError extends Error { constructor() { super('This time is at capacity. Please choose another slot.'); this.code = 'SLOT_CONFLICT'; } }

function accessError() {
  return Object.assign(new Error('Booking not found or management access has expired.'), { code: 'NOT_FOUND' });
}

export function hashManagementToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

function validManagementToken(token) {
  return /^[A-Za-z0-9_-]{43}$/.test(String(token || ''));
}

function bookingSnapshot(booking, overrides = {}) {
  return {
    date: overrides.date ?? booking.date ?? '',
    time: overrides.time ?? booking.time ?? '',
    location: overrides.location ?? booking.location ?? '',
    staff: overrides.staff ?? booking.staff ?? '',
    status: overrides.status ?? booking.status ?? 'confirmed'
  };
}

function capacityFor(rule) {
  return Math.max(1, Math.min(100, Number(rule.capacity || 1)));
}

async function confirmedBookingsForDate(BookingModel, filter) {
  const result = await BookingModel.find(filter, { time: 1, slotPosition: 1 });
  return Array.isArray(result) ? result : [];
}

async function createAtAvailablePosition({ BookingModel, document, capacity }) {
  for (let slotPosition = 0; slotPosition < capacity; slotPosition += 1) {
    try {
      return await BookingModel.create({ ...document, slotPosition });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  throw new SlotConflictError();
}

async function moveToAvailablePosition({ BookingModel, filter, update, capacity }) {
  for (let slotPosition = 0; slotPosition < capacity; slotPosition += 1) {
    try {
      const moved = await BookingModel.findOneAndUpdate(
        filter,
        { ...update, $set: { ...update.$set, slotPosition } },
        { new: true, runValidators: true }
      );
      if (moved) return moved;
      return null;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  throw new SlotConflictError();
}

export async function createBookingAtomic({ shop, rule, input, BookingModel = Booking, notify = sendBookingNotifications, now = new Date() }) {
  if (!rule.enabled || !futureSlotsForDate(rule, input.date, shop.timezone || 'UTC', now).includes(input.time)) {
    throw Object.assign(new Error('The selected time is unavailable, outside the booking window, or does not meet the minimum notice.'), { code: 'SLOT_UNAVAILABLE' });
  }
  for (const question of rule.customQuestions || []) {
    if (question.required && !input.answers.find(answer => answer.question === question.label && answer.answer)) {
      throw Object.assign(new Error(`Please answer: ${question.label}`), { code: 'VALIDATION_ERROR' });
    }
  }
  const managementToken = randomBytes(32).toString('base64url');
  const document = {
    shopId: shop._id, ruleId: rule._id, sourceType: rule.sourceType || 'product', serviceType: rule.serviceType || 'product',
    productId: rule.productId || '', productTitle: rule.productTitle,
    date: input.date, time: input.time, slotKey: slotKey(input.date, input.time), duration: rule.duration,
    buffer: rule.buffer, timezone: shop.timezone || 'UTC', location: rule.location, staff: rule.staff,
    managementTokenHash: hashManagementToken(managementToken),
    customer: input.customer, note: input.note, answers: input.answers, status: 'confirmed',
    events: [{
      type: 'created', actor: 'customer', at: now,
      to: { date: input.date, time: input.time, location: rule.location || '', staff: rule.staff || '', status: 'confirmed' }
    }]
  };
  const booking = await createAtAvailablePosition({ BookingModel, document, capacity: capacityFor(rule) });
  Promise.resolve(notify(booking, shop.email, managementToken, shop.emailSettings || null)).catch(error => console.error('Email notification failed', error.message));
  return { booking, managementToken };
}

export async function createBookingForStore({ shopId, handle, productId, ruleId, input }) {
  let rule;
  let shop;
  if (ruleId) {
    rule = await AppointmentRule.findOne({ _id: ruleId, enabled: true });
    if (!rule) throw Object.assign(new Error('Appointment service is not available.'), { code: 'NOT_FOUND' });
    shop = await findInstalledShop({ objectId: rule.shopId });
  } else {
    shop = await findInstalledShop({ shopId, shop: handle });
    if (shop) rule = await AppointmentRule.findOne({ shopId: shop._id, sourceType: 'product', productId, enabled: true });
  }
  if (!shop) throw Object.assign(new Error('Store is not available.'), { code: 'NOT_FOUND' });
  if (!rule) throw Object.assign(new Error('Appointments are not enabled for this service.'), { code: 'NOT_FOUND' });
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
  const booked = await confirmedBookingsForDate(BookingModel, { shopId: booking.shopId, ruleId: booking.ruleId, date, status: 'confirmed', _id: { $ne: booking._id } });
  return { date, slots: filterSlotsByCapacity(allSlots, booked, capacityFor(rule)) };
}

export async function cancelManagedBooking({ bookingId, token, BookingModel = Booking, notify = sendBookingCancelledNotification, now = new Date() }) {
  if (!validManagementToken(token)) throw accessError();
  const current = await getManagedBooking({ bookingId, token, BookingModel });
  if (current.status !== 'confirmed') throw accessError();
  const booking = await BookingModel.findOneAndUpdate(
    { _id: bookingId, managementTokenHash: hashManagementToken(token), status: 'confirmed', slotKey: current.slotKey },
    {
      $set: { status: 'cancelled', cancelledAt: now },
      $push: { events: { type: 'customer_cancelled', actor: 'customer', at: now, from: bookingSnapshot(current), to: bookingSnapshot(current, { status: 'cancelled' }) } }
    },
    { new: true }
  );
  if (!booking) throw accessError();
  Promise.resolve(notify(booking)).catch(error => console.error('Cancellation email notification failed', error.message));
  return booking;
}

export async function rescheduleManagedBooking({ bookingId, token, date, time, BookingModel = Booking, RuleModel = AppointmentRule, notify = sendCustomerRescheduledNotification, now = new Date() }) {
  const booking = await getManagedBooking({ bookingId, token, BookingModel });
  if (booking.status !== 'confirmed') throw Object.assign(new Error('This appointment is no longer active.'), { status: 409, code: 'BOOKING_INACTIVE' });
  if (Number(booking.customerRescheduleCount || 0) >= 1) {
    throw Object.assign(new Error('You have already used your online change. Please contact the store for another change.'), { status: 409, code: 'RESCHEDULE_LIMIT' });
  }
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: booking.shopId, enabled: true });
  if (!rule || !futureSlotsForDate(rule, date, booking.timezone || 'UTC', now).includes(time)) {
    throw Object.assign(new Error('The selected time is unavailable or outside the current scheduling policy.'), { code: 'VALIDATION_ERROR' });
  }
  const updated = await moveToAvailablePosition({
    BookingModel,
    filter: { _id: booking._id, managementTokenHash: hashManagementToken(token), status: 'confirmed', slotKey: booking.slotKey, $or: [{ customerRescheduleCount: 0 }, { customerRescheduleCount: { $exists: false } }] },
    update: {
      $set: { date, time, slotKey: slotKey(date, time) },
      $inc: { customerRescheduleCount: 1 },
      $push: { events: { type: 'customer_rescheduled', actor: 'customer', at: now, from: bookingSnapshot(booking), to: bookingSnapshot(booking, { date, time }) } }
    },
    capacity: capacityFor(rule)
  });
  if (!updated) throw Object.assign(new Error('Your online change is no longer available. Please contact the store.'), { status: 409, code: 'RESCHEDULE_LIMIT' });
  Promise.resolve(notify(updated, token)).catch(error => console.error('Reschedule email notification failed', error.message));
  return updated;
}

export async function updateBookingByMerchant({ shopObjectId, bookingId, input, BookingModel = Booking, RuleModel = AppointmentRule, notify = sendBookingChangedNotification, now = new Date() }) {
  const booking = await BookingModel.findOne({ _id: bookingId, shopId: shopObjectId, status: 'confirmed' });
  if (!booking) throw Object.assign(new Error('Confirmed booking not found.'), { code: 'NOT_FOUND' });
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: shopObjectId, enabled: true });
  if (!rule || !futureSlotsForDate(rule, input.date, booking.timezone || 'UTC', now).includes(input.time)) {
    throw Object.assign(new Error('The selected date and time are outside this service schedule or scheduling policy.'), { code: 'VALIDATION_ERROR' });
  }
  const updated = await moveToAvailablePosition({
    BookingModel,
    filter: { _id: booking._id, shopId: shopObjectId, status: 'confirmed', slotKey: booking.slotKey },
    update: {
      $set: { date: input.date, time: input.time, slotKey: slotKey(input.date, input.time), location: input.location, staff: input.staff, merchantEditedAt: now },
      $push: { events: { type: 'merchant_updated', actor: 'merchant', at: now, from: bookingSnapshot(booking), to: bookingSnapshot(booking, input) } }
    },
    capacity: capacityFor(rule)
  });
  if (!updated) throw Object.assign(new Error('This booking changed in another session. Refresh and try again.'), { status: 409, code: 'BOOKING_CHANGED' });
  const notification = await Promise.resolve(notify(updated)).catch(error => ({ skipped: false, attempted: 1, failed: 1, reason: error.message }));
  return { booking: updated, notification };
}

export async function cancelBookingByMerchant({ shopObjectId, bookingId, BookingModel = Booking, notify = sendBookingCancelledNotification, now = new Date() }) {
  const current = await BookingModel.findOne({ _id: bookingId, shopId: shopObjectId, status: 'confirmed' });
  if (!current) throw Object.assign(new Error('Confirmed booking not found.'), { code: 'NOT_FOUND' });
  const booking = await BookingModel.findOneAndUpdate(
    { _id: bookingId, shopId: shopObjectId, status: 'confirmed', slotKey: current.slotKey },
    {
      $set: { status: 'cancelled', cancelledAt: now },
      $push: { events: { type: 'merchant_cancelled', actor: 'merchant', at: now, from: bookingSnapshot(current), to: bookingSnapshot(current, { status: 'cancelled' }) } }
    },
    { new: true }
  );
  if (!booking) throw Object.assign(new Error('Confirmed booking not found.'), { code: 'NOT_FOUND' });
  const notification = await Promise.resolve(notify(booking)).catch(error => ({ skipped: false, attempted: 1, failed: 1, reason: error.message }));
  return { booking, notification };
}

export async function setBookingStatusByMerchant({ shopObjectId, bookingId, status, BookingModel = Booking, now = new Date() }) {
  if (!['completed', 'no_show'].includes(status)) throw Object.assign(new Error('Unsupported booking status.'), { code: 'VALIDATION_ERROR' });
  const current = await BookingModel.findOne({ _id: bookingId, shopId: shopObjectId, status: 'confirmed' });
  if (!current) throw Object.assign(new Error('Confirmed booking not found.'), { code: 'NOT_FOUND' });
  const eventType = status === 'completed' ? 'merchant_completed' : 'merchant_no_show';
  const timestampField = status === 'completed' ? 'completedAt' : 'noShowAt';
  const booking = await BookingModel.findOneAndUpdate(
    { _id: bookingId, shopId: shopObjectId, status: 'confirmed', slotKey: current.slotKey },
    {
      $set: { status, [timestampField]: now },
      $push: { events: { type: eventType, actor: 'merchant', at: now, from: bookingSnapshot(current), to: bookingSnapshot(current, { status }) } }
    },
    { new: true }
  );
  if (!booking) throw Object.assign(new Error('Confirmed booking not found.'), { code: 'NOT_FOUND' });
  return booking;
}
