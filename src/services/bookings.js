import mongoose from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { AppointmentRule } from '../models/AppointmentRule.js';
import { Booking } from '../models/Booking.js';
import { BookingReservation } from '../models/BookingReservation.js';
import { Staff } from '../models/Staff.js';
import { StaffReservation } from '../models/StaffReservation.js';
import { bookingModeFor, filterSlotsByCapacity, futureSlotsForDate, isAllDayBookableDate, occurrenceSlotKey, slotKey, resolveRuleTimezone } from '../lib/slots.js';
import {
  sendBookingCancelledNotification, sendBookingChangedNotification, sendBookingNotifications, sendCustomerRescheduledNotification,
  sendStaffAssignedNotification, sendStaffBookingUpdatedNotification, sendStaffCancelledNotification
} from './email.js';
import { findInstalledShop } from './shops.js';
import { normalizedStaffAssignment, releaseStaffReservations, reserveStaffForBooking, staffAvailabilityForDate } from './staffing.js';
import { queueBookingGoogleCalendarSync } from './calendar-sync.js';

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
    staffId: overrides.staffId ?? booking.staffId ?? null,
    staffEmail: overrides.staffEmail ?? booking.staffEmail ?? '',
    status: overrides.status ?? booking.status ?? 'confirmed'
  };
}

function capacityFor(rule) {
  return Math.max(1, Math.min(100, Number(rule.capacity || 1)));
}

function reservationModelFor(BookingModel, ReservationModel) {
  if (ReservationModel !== undefined) return ReservationModel;
  return BookingModel === Booking ? BookingReservation : null;
}

function staffReservationModelFor(BookingModel, StaffReservationModel) {
  if (StaffReservationModel !== undefined) return StaffReservationModel;
  return BookingModel === Booking ? StaffReservation : null;
}

async function confirmedBookingsForDate(BookingModel, filter) {
  const result = await BookingModel.find(filter, { time: 1, slotPosition: 1 });
  return Array.isArray(result) ? result : [];
}

async function createAtAvailablePosition({ BookingModel, document, capacity }) {
  for (let slotPosition = 0; slotPosition < capacity; slotPosition += 1) {
    try {
      const occurrences = Array.isArray(document.occurrences)
        ? document.occurrences.map((occurrence, index) => index === 0 ? { ...occurrence, slotPosition } : occurrence)
        : document.occurrences;
      return await BookingModel.create({ ...document, occurrences, slotPosition });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  throw new SlotConflictError();
}

async function moveToAvailablePosition({ BookingModel, filter, update, capacity }) {
  for (let slotPosition = 0; slotPosition < capacity; slotPosition += 1) {
    try {
      const nextSet = { ...update.$set, slotPosition };
      if (Array.isArray(nextSet.occurrences)) {
        nextSet.occurrences = nextSet.occurrences.map((occurrence, index) => index === 0 ? { ...occurrence, slotPosition } : occurrence);
      }
      const moved = await BookingModel.findOneAndUpdate(
        filter,
        { ...update, $set: nextSet },
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

function requestedOccurrences(rule, input, timezone, now) {
  const mode = bookingModeFor(rule);
  if (mode === 'all_day') {
    if (!input.date || !isAllDayBookableDate(rule, input.date, timezone, now)) {
      throw Object.assign(new Error('The selected date is unavailable, outside the booking window, or does not meet the minimum notice.'), { code: 'SLOT_UNAVAILABLE' });
    }
    return [{ date: input.date, time: '', slotKey: occurrenceSlotKey(mode, input.date) }];
  }
  if (mode === 'multi_slot') {
    const requested = Array.isArray(input.occurrences) ? input.occurrences : [];
    const required = Math.max(2, Math.min(12, Number(rule.sessionsRequired || 3)));
    if (requested.length !== required) {
      throw Object.assign(new Error(`Choose exactly ${required} session${required === 1 ? '' : 's'} for this booking.`), { code: 'VALIDATION_ERROR' });
    }
    const unique = new Set();
    const result = requested.map(item => {
      const key = occurrenceSlotKey(mode, item.date, item.time);
      if (unique.has(key) || !futureSlotsForDate(rule, item.date, timezone, now).includes(item.time)) {
        throw Object.assign(new Error('One or more selected sessions are unavailable or outside the current scheduling policy.'), { code: 'SLOT_UNAVAILABLE' });
      }
      unique.add(key);
      return { date: item.date, time: item.time, slotKey: key };
    });
    return result.sort((a, b) => a.slotKey.localeCompare(b.slotKey));
  }
  if (!rule.enabled || !futureSlotsForDate(rule, input.date, timezone, now).includes(input.time)) {
    throw Object.assign(new Error('The selected time is unavailable, outside the booking window, or does not meet the minimum notice.'), { code: 'SLOT_UNAVAILABLE' });
  }
  return [{ date: input.date, time: input.time, slotKey: occurrenceSlotKey(mode, input.date, input.time) }];
}

async function reserveOccurrences({ ReservationModel, bookingId, shop, rule, occurrences }) {
  const capacity = capacityFor(rule);
  const reserved = [];
  try {
    for (const occurrence of occurrences) {
      let reservation = null;
      for (let slotPosition = 0; slotPosition < capacity; slotPosition += 1) {
        try {
          reservation = await ReservationModel.create({
            shopId: shop._id,
            ruleId: rule._id,
            bookingId,
            bookingMode: bookingModeFor(rule),
            date: occurrence.date,
            time: occurrence.time || '',
            slotKey: occurrence.slotKey,
            slotPosition
          });
          break;
        } catch (error) {
          if (error?.code !== 11000) throw error;
        }
      }
      if (!reservation) throw new SlotConflictError();
      reserved.push({ ...occurrence, slotPosition: Number(reservation.slotPosition || 0) });
    }
    return reserved;
  } catch (error) {
    await ReservationModel.deleteMany({ bookingId }).catch(() => {});
    throw error;
  }
}

async function releaseReservations(ReservationModel, bookingId) {
  if (!ReservationModel) return;
  await ReservationModel.deleteMany({ bookingId }).catch(error => console.error('Booking reservation cleanup failed', error.message));
}

async function syncSingleReservation({ ReservationModel, booking, rule }) {
  if (!ReservationModel || bookingModeFor(rule) !== 'slot') return;
  await ReservationModel.deleteMany({ bookingId: booking._id });
  try {
    await ReservationModel.create({
      shopId: booking.shopId,
      ruleId: booking.ruleId,
      bookingId: booking._id,
      bookingMode: 'slot',
      date: booking.date,
      time: booking.time,
      slotKey: booking.slotKey,
      slotPosition: Number(booking.slotPosition || 0)
    });
  } catch (error) {
    console.error('Booking reservation sync failed', error.message);
  }
}

export async function createBookingAtomic({ shop, rule, input, BookingModel = Booking, ReservationModel, StaffReservationModel, StaffModel = Staff, notify = sendBookingNotifications, now = new Date() }) {
  const mode = bookingModeFor(rule);
  const timezone = resolveRuleTimezone(rule, shop.timezone || 'UTC');
  const occurrences = requestedOccurrences(rule, input, timezone, now);
  for (const question of rule.customQuestions || []) {
    if (question.required && !input.answers.find(answer => answer.question === question.label && answer.answer)) {
      throw Object.assign(new Error(`Please answer: ${question.label}`), { code: 'VALIDATION_ERROR' });
    }
  }
  const managementToken = randomBytes(32).toString('base64url');
  const activeReservationModel = reservationModelFor(BookingModel, ReservationModel);
  const bookingId = new mongoose.Types.ObjectId();
  let reserved = occurrences.map(item => ({ ...item, slotPosition: 0 }));
  if (activeReservationModel) reserved = await reserveOccurrences({ ReservationModel: activeReservationModel, bookingId, shop, rule, occurrences });

  const activeStaffReservationModel = staffReservationModelFor(BookingModel, StaffReservationModel);
  let assignedStaff = null;
  try {
    if (activeStaffReservationModel || normalizedStaffAssignment(rule).mode === 'none') {
      assignedStaff = await reserveStaffForBooking({
        shopId: shop._id, rule, occurrences: reserved, bookingId, requestedStaffId: input.staffId || '',
        StaffModel, StaffReservationModel: activeStaffReservationModel || StaffReservation
      });
    }
  } catch (error) {
    if (activeReservationModel) await releaseReservations(activeReservationModel, bookingId);
    throw error;
  }
  const staffName = assignedStaff?.name || rule.staff || '';
  const staffId = assignedStaff?._id || null;
  const staffEmail = assignedStaff?.email || '';
  reserved = reserved.map(item => ({ ...item, staffId, staffName }));

  const first = reserved[0];
  const primaryTime = mode === 'all_day' ? '00:00' : first.time;
  const document = {
    _id: bookingId,
    shopId: shop._id, ruleId: rule._id, bookingSource: rule.bookingSource || (rule.sourceType === 'standalone' ? 'direct' : 'product'),
    sourceType: rule.sourceType || 'product', serviceType: rule.serviceType === 'product' ? 'appointment' : (rule.serviceType || 'appointment'),
    bookingMode: mode,
    productId: rule.productId || '', productTitle: rule.serviceTitle || rule.productTitle,
    date: first.date, time: primaryTime, slotKey: first.slotKey, slotPosition: Number(first.slotPosition || 0), occurrences: reserved,
    duration: rule.duration, buffer: rule.buffer, timezone, location: rule.location, staff: staffName, staffId, staffEmail,
    managementTokenHash: hashManagementToken(managementToken),
    customer: input.customer, note: input.note, answers: input.answers, status: 'confirmed',
    events: [{
      type: 'created', actor: 'customer', at: now,
      to: { date: first.date, time: primaryTime, location: rule.location || '', staff: staffName, staffId, staffEmail, status: 'confirmed' }
    }]
  };
  let booking;
  try {
    if (!activeReservationModel && mode === 'slot') booking = await createAtAvailablePosition({ BookingModel, document, capacity: capacityFor(rule) });
    else booking = await BookingModel.create(document);
  } catch (error) {
    if (activeReservationModel) await releaseReservations(activeReservationModel, bookingId);
    if (activeStaffReservationModel) await releaseStaffReservations({ bookingId, StaffReservationModel: activeStaffReservationModel });
    if (error?.code === 11000) throw new SlotConflictError();
    throw error;
  }
  Promise.resolve(notify(booking, shop.email, managementToken, shop.emailSettings || null)).catch(error => console.error('Email notification failed', error.message));
  if (BookingModel === Booking && booking.staffId) Promise.resolve(sendStaffAssignedNotification(booking, shop.emailSettings || null)).catch(error => console.error('Staff assignment email failed', error.message));
  if (BookingModel === Booking) queueBookingGoogleCalendarSync(booking._id, 'created');
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
    if (shop) rule = await AppointmentRule.findOne({ shopId: shop._id, productId, enabled: true, $or: [{ bookingSource: { $in: ['product', 'both'] } }, { bookingSource: { $exists: false }, sourceType: 'product' }] });
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
  if (booking.status !== 'confirmed' || (booking.bookingMode || 'slot') !== 'slot') return { date, slots: [] };
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: booking.shopId, enabled: true });
  if (!rule) return { date, slots: [] };
  const allSlots = futureSlotsForDate(rule, date, booking.timezone || 'UTC', now);
  const booked = await confirmedBookingsForDate(BookingModel, { shopId: booking.shopId, ruleId: booking.ruleId, date, status: 'confirmed', _id: { $ne: booking._id } });
  const capacitySlots = filterSlotsByCapacity(allSlots, booked, capacityFor(rule));
  const activeStaffReservationModel = staffReservationModelFor(BookingModel);
  if (!activeStaffReservationModel) return { date, slots: capacitySlots };
  const staffResult = await staffAvailabilityForDate({ shopId: booking.shopId, rule, date, baseSlots: capacitySlots, requestedStaffId: booking.staffId ? String(booking.staffId) : '', ignoreBookingId: booking._id, StaffReservationModel: activeStaffReservationModel });
  return { date, slots: staffResult.slots };
}

export async function cancelManagedBooking({ bookingId, token, BookingModel = Booking, ReservationModel, StaffReservationModel, notify = sendBookingCancelledNotification, now = new Date() }) {
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
  await releaseReservations(reservationModelFor(BookingModel, ReservationModel), booking._id);
  const activeStaffReservationModel = staffReservationModelFor(BookingModel, StaffReservationModel);
  if (activeStaffReservationModel) await releaseStaffReservations({ bookingId: booking._id, StaffReservationModel: activeStaffReservationModel });
  Promise.resolve(notify(booking)).catch(error => console.error('Cancellation email notification failed', error.message));
  if (BookingModel === Booking && booking.staffId) Promise.resolve(sendStaffCancelledNotification(booking)).catch(error => console.error('Staff cancellation email failed', error.message));
  if (BookingModel === Booking) queueBookingGoogleCalendarSync(booking._id, 'customer_cancelled');
  return booking;
}


function occurrencesFromBooking(booking) {
  if (Array.isArray(booking.occurrences) && booking.occurrences.length) return booking.occurrences.map(item => ({ date: item.date, time: item.time || '', slotKey: item.slotKey || occurrenceSlotKey(booking.bookingMode || 'slot', item.date, item.time || '') }));
  return [{ date: booking.date, time: (booking.bookingMode || 'slot') === 'all_day' ? '' : booking.time, slotKey: booking.slotKey || occurrenceSlotKey(booking.bookingMode || 'slot', booking.date, booking.time || '') }];
}

async function restorePreviousStaffReservation({ booking, rule, StaffModel, StaffReservationModel }) {
  if (!StaffReservationModel || !booking.staffId) return;
  try {
    await reserveStaffForBooking({ shopId: booking.shopId, rule, occurrences: occurrencesFromBooking(booking), bookingId: booking._id, requestedStaffId: String(booking.staffId), StaffModel, StaffReservationModel });
  } catch (error) {
    console.error('Could not restore previous staff reservation', error.message);
  }
}

export async function rescheduleManagedBooking({ bookingId, token, date, time, BookingModel = Booking, ReservationModel, StaffReservationModel, StaffModel = Staff, RuleModel = AppointmentRule, notify = sendCustomerRescheduledNotification, now = new Date() }) {
  const booking = await getManagedBooking({ bookingId, token, BookingModel });
  if ((booking.bookingMode || 'slot') !== 'slot') throw Object.assign(new Error('Online rescheduling is currently available for minute/hour appointments only.'), { status: 409, code: 'BOOKING_MODE_RESCHEDULE_UNSUPPORTED' });
  if (booking.status !== 'confirmed') throw Object.assign(new Error('This appointment is no longer active.'), { status: 409, code: 'BOOKING_INACTIVE' });
  if (Number(booking.customerRescheduleCount || 0) >= 1) throw Object.assign(new Error('You have already used your online change. Please contact the store for another change.'), { status: 409, code: 'RESCHEDULE_LIMIT' });
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: booking.shopId, enabled: true });
  if (!rule || !futureSlotsForDate(rule, date, booking.timezone || 'UTC', now).includes(time)) throw Object.assign(new Error('The selected time is unavailable or outside the current scheduling policy.'), { code: 'VALIDATION_ERROR' });
  const nextOccurrence = { date, time, slotKey: slotKey(date, time), slotPosition: 0 };
  const activeStaffReservationModel = staffReservationModelFor(BookingModel, StaffReservationModel);
  let assignedStaff = null;
  if (activeStaffReservationModel) {
    await releaseStaffReservations({ bookingId: booking._id, StaffReservationModel: activeStaffReservationModel });
    try {
      assignedStaff = await reserveStaffForBooking({ shopId: booking.shopId, rule, occurrences: [nextOccurrence], bookingId: booking._id, requestedStaffId: booking.staffId ? String(booking.staffId) : '', StaffModel, StaffReservationModel: activeStaffReservationModel });
    } catch (error) {
      await restorePreviousStaffReservation({ booking, rule, StaffModel, StaffReservationModel: activeStaffReservationModel });
      throw error;
    }
  }
  const nextStaff = assignedStaff?.name || booking.staff || rule.staff || '';
  const nextStaffId = assignedStaff?._id || booking.staffId || null;
  const nextStaffEmail = assignedStaff?.email || booking.staffEmail || '';
  const updated = await moveToAvailablePosition({
    BookingModel,
    filter: { _id: booking._id, managementTokenHash: hashManagementToken(token), status: 'confirmed', slotKey: booking.slotKey, $or: [{ customerRescheduleCount: 0 }, { customerRescheduleCount: { $exists: false } }] },
    update: {
      $set: { date, time, slotKey: nextOccurrence.slotKey, occurrences: [{ ...nextOccurrence, staffId: nextStaffId, staffName: nextStaff }], staff: nextStaff, staffId: nextStaffId, staffEmail: nextStaffEmail },
      $inc: { customerRescheduleCount: 1 },
      $push: { events: { type: 'customer_rescheduled', actor: 'customer', at: now, from: bookingSnapshot(booking), to: bookingSnapshot(booking, { date, time, staff: nextStaff, staffId: nextStaffId, staffEmail: nextStaffEmail }) } }
    },
    capacity: capacityFor(rule)
  });
  if (!updated) {
    if (activeStaffReservationModel) {
      await releaseStaffReservations({ bookingId: booking._id, StaffReservationModel: activeStaffReservationModel });
      await restorePreviousStaffReservation({ booking, rule, StaffModel, StaffReservationModel: activeStaffReservationModel });
    }
    throw Object.assign(new Error('Your online change is no longer available. Please contact the store.'), { status: 409, code: 'RESCHEDULE_LIMIT' });
  }
  await syncSingleReservation({ ReservationModel: reservationModelFor(BookingModel, ReservationModel), booking: updated, rule });
  Promise.resolve(notify(updated, token)).catch(error => console.error('Reschedule email notification failed', error.message));
  if (BookingModel === Booking && (updated.staffId || booking.staffId)) Promise.resolve(sendStaffBookingUpdatedNotification(updated, booking)).catch(error => console.error('Staff reschedule email failed', error.message));
  if (BookingModel === Booking) queueBookingGoogleCalendarSync(updated._id, 'customer_rescheduled');
  return updated;
}

export async function updateBookingByMerchant({ shopObjectId, bookingId, input, BookingModel = Booking, ReservationModel, StaffReservationModel, StaffModel = Staff, RuleModel = AppointmentRule, notify = sendBookingChangedNotification, now = new Date() }) {
  const booking = await BookingModel.findOne({ _id: bookingId, shopId: shopObjectId, status: 'confirmed' });
  if (!booking) throw Object.assign(new Error('Confirmed booking not found.'), { code: 'NOT_FOUND' });
  if ((booking.bookingMode || 'slot') !== 'slot') throw Object.assign(new Error('Use the service schedule for non-slot booking modes. Direct date editing is available for minute/hour appointments only.'), { code: 'VALIDATION_ERROR' });
  const rule = await RuleModel.findOne({ _id: booking.ruleId, shopId: shopObjectId, enabled: true });
  if (!rule || !futureSlotsForDate(rule, input.date, booking.timezone || 'UTC', now).includes(input.time)) throw Object.assign(new Error('The selected date and time are outside this service schedule or scheduling policy.'), { code: 'VALIDATION_ERROR' });
  const nextOccurrence = { date: input.date, time: input.time, slotKey: slotKey(input.date, input.time), slotPosition: 0 };
  const activeStaffReservationModel = staffReservationModelFor(BookingModel, StaffReservationModel);
  let assignedStaff = null;
  if (activeStaffReservationModel) {
    await releaseStaffReservations({ bookingId: booking._id, StaffReservationModel: activeStaffReservationModel });
    try {
      assignedStaff = await reserveStaffForBooking({ shopId: shopObjectId, rule, occurrences: [nextOccurrence], bookingId: booking._id, requestedStaffId: input.staffId || (booking.staffId ? String(booking.staffId) : ''), StaffModel, StaffReservationModel: activeStaffReservationModel });
    } catch (error) {
      await restorePreviousStaffReservation({ booking, rule, StaffModel, StaffReservationModel: activeStaffReservationModel });
      throw error;
    }
  }
  const assignment = normalizedStaffAssignment(rule);
  const nextStaff = assignment.mode === 'none' ? (input.staff || booking.staff || '') : (assignedStaff?.name || booking.staff || '');
  const nextStaffId = assignment.mode === 'none' ? (booking.staffId || null) : (assignedStaff?._id || booking.staffId || null);
  const nextStaffEmail = assignment.mode === 'none' ? (booking.staffEmail || '') : (assignedStaff?.email || booking.staffEmail || '');
  const updated = await moveToAvailablePosition({
    BookingModel,
    filter: { _id: booking._id, shopId: shopObjectId, status: 'confirmed', slotKey: booking.slotKey },
    update: {
      $set: { date: input.date, time: input.time, slotKey: nextOccurrence.slotKey, occurrences: [{ ...nextOccurrence, staffId: nextStaffId, staffName: nextStaff }], location: input.location, staff: nextStaff, staffId: nextStaffId, staffEmail: nextStaffEmail, merchantEditedAt: now },
      $push: { events: { type: 'merchant_updated', actor: 'merchant', at: now, from: bookingSnapshot(booking), to: bookingSnapshot(booking, { ...input, staff: nextStaff, staffId: nextStaffId, staffEmail: nextStaffEmail }) } }
    },
    capacity: capacityFor(rule)
  });
  if (!updated) {
    if (activeStaffReservationModel) {
      await releaseStaffReservations({ bookingId: booking._id, StaffReservationModel: activeStaffReservationModel });
      await restorePreviousStaffReservation({ booking, rule, StaffModel, StaffReservationModel: activeStaffReservationModel });
    }
    throw Object.assign(new Error('This booking changed in another session. Refresh and try again.'), { status: 409, code: 'BOOKING_CHANGED' });
  }
  await syncSingleReservation({ ReservationModel: reservationModelFor(BookingModel, ReservationModel), booking: updated, rule });
  const notification = await Promise.resolve(notify(updated)).catch(error => ({ skipped: false, attempted: 1, failed: 1, reason: error.message }));
  if (BookingModel === Booking && (updated.staffId || booking.staffId)) Promise.resolve(sendStaffBookingUpdatedNotification(updated, booking)).catch(error => console.error('Staff update email failed', error.message));
  if (BookingModel === Booking) queueBookingGoogleCalendarSync(updated._id, 'merchant_updated');
  return { booking: updated, notification };
}

export async function cancelBookingByMerchant({ shopObjectId, bookingId, BookingModel = Booking, ReservationModel, StaffReservationModel, notify = sendBookingCancelledNotification, now = new Date() }) {
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
  await releaseReservations(reservationModelFor(BookingModel, ReservationModel), booking._id);
  const activeStaffReservationModel = staffReservationModelFor(BookingModel, StaffReservationModel);
  if (activeStaffReservationModel) await releaseStaffReservations({ bookingId: booking._id, StaffReservationModel: activeStaffReservationModel });
  const notification = await Promise.resolve(notify(booking)).catch(error => ({ skipped: false, attempted: 1, failed: 1, reason: error.message }));
  if (BookingModel === Booking && booking.staffId) Promise.resolve(sendStaffCancelledNotification(booking)).catch(error => console.error('Staff cancellation email failed', error.message));
  if (BookingModel === Booking) queueBookingGoogleCalendarSync(booking._id, 'merchant_cancelled');
  return { booking, notification };
}

export async function setBookingStatusByMerchant({ shopObjectId, bookingId, status, BookingModel = Booking, ReservationModel, StaffReservationModel, now = new Date() }) {
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
  await releaseReservations(reservationModelFor(BookingModel, ReservationModel), booking._id);
  const activeStaffReservationModel = staffReservationModelFor(BookingModel, StaffReservationModel);
  if (activeStaffReservationModel) await releaseStaffReservations({ bookingId: booking._id, StaffReservationModel: activeStaffReservationModel });
  return booking;
}
