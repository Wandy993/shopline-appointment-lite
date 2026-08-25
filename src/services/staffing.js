import mongoose from 'mongoose';
import { Staff } from '../models/Staff.js';
import { StaffReservation } from '../models/StaffReservation.js';
import { bookingModeFor, minutesFromTime, windowsForDate, isDateAllowed } from '../lib/slots.js';

export class StaffConflictError extends Error {
  constructor(message = 'The selected staff member is no longer available for this time.') {
    super(message);
    this.code = 'STAFF_CONFLICT';
    this.status = 409;
  }
}

export function normalizedStaffAssignment(rule = {}) {
  const raw = rule.staffAssignment || {};
  const mode = ['none', 'any', 'customer_choice', 'fixed'].includes(raw.mode) ? raw.mode : 'none';
  const staffIds = [...new Set((raw.staffIds || []).map(value => String(value || '')).filter(value => mongoose.isValidObjectId(value)))];
  return { mode, staffIds };
}

export function staffBucketsForOccurrence(rule, occurrence) {
  const mode = bookingModeFor(rule);
  const date = String(occurrence?.date || '');
  if (!date) return [];
  if (mode === 'all_day') return Array.from({ length: 288 }, (_, index) => `${date}#${String(index * 5).padStart(4, '0')}`);
  const start = minutesFromTime(String(occurrence?.time || ''));
  if (!Number.isFinite(start)) return [];
  const duration = Math.max(5, Number(rule.duration || 60));
  const buffer = Math.max(0, Number(rule.buffer || 0));
  const end = Math.min(24 * 60, start + duration + buffer);
  const first = Math.floor(start / 5) * 5;
  const last = Math.ceil(end / 5) * 5;
  const buckets = [];
  for (let minute = first; minute < last; minute += 5) buckets.push(`${date}#${String(minute).padStart(4, '0')}`);
  return buckets;
}

export function staffScheduleAllowsOccurrence(staff, rule, occurrence) {
  if (!staff || staff.status === 'inactive') return false;
  const mode = bookingModeFor(rule);
  const date = String(occurrence?.date || '');
  if (mode === 'all_day') return isDateAllowed(staff, date);
  const time = String(occurrence?.time || '');
  const start = minutesFromTime(time);
  const duration = Math.max(5, Number(rule.duration || 60));
  const buffer = Math.max(0, Number(rule.buffer || 0));
  if (!Number.isFinite(start)) return false;
  return windowsForDate(staff, date).some(window => {
    const windowStart = minutesFromTime(window.start);
    const windowEnd = minutesFromTime(window.end);
    return Number.isFinite(windowStart) && Number.isFinite(windowEnd) && start >= windowStart && start + duration + buffer <= windowEnd;
  });
}

function sameServiceOccurrence(reservation, ruleId, occurrence) {
  return String(reservation.ruleId || '') === String(ruleId || '') && reservation.slotKey === occurrence.slotKey;
}

function hasBucketOverlap(reservation, buckets) {
  const wanted = new Set(buckets);
  return (reservation.bucketKeys || []).some(key => wanted.has(key));
}

export async function assignedActiveStaff(rule, { StaffModel = Staff } = {}) {
  const assignment = normalizedStaffAssignment(rule);
  if (assignment.mode === 'none' || !assignment.staffIds.length) return [];
  const staff = await StaffModel.find({ _id: { $in: assignment.staffIds }, shopId: rule.shopId, status: 'active' }).lean();
  const order = new Map(assignment.staffIds.map((id, index) => [id, index]));
  return staff.sort((a, b) => (order.get(String(a._id)) ?? 999) - (order.get(String(b._id)) ?? 999));
}

export async function publicStaffOptions(rule, options = {}) {
  const assignment = normalizedStaffAssignment(rule);
  const staff = await assignedActiveStaff(rule, options);
  return {
    mode: assignment.mode,
    options: staff.map(item => ({ id: String(item._id), name: item.name }))
  };
}

async function reservationRowsForStaff(staffIds, dates, { shopId, StaffReservationModel = StaffReservation } = {}) {
  if (!staffIds.length || !dates.length) return [];
  return StaffReservationModel.find({ shopId, staffId: { $in: staffIds }, date: { $in: dates } }).select('staffId ruleId slotKey date bucketKeys bookingIds').lean();
}

export async function availableStaffForOccurrences({ shopId, rule, occurrences, requestedStaffId = '', ignoreBookingId = '', StaffModel = Staff, StaffReservationModel = StaffReservation }) {
  const assignment = normalizedStaffAssignment(rule);
  if (assignment.mode === 'none' || !assignment.staffIds.length) return [];
  const active = await assignedActiveStaff(rule, { StaffModel });
  let candidates = active;
  if (assignment.mode === 'fixed') candidates = active.filter(item => String(item._id) === assignment.staffIds[0]);
  if (assignment.mode === 'customer_choice') {
    if (!requestedStaffId) return [];
    if (!assignment.staffIds.includes(String(requestedStaffId))) return [];
    candidates = active.filter(item => String(item._id) === String(requestedStaffId));
  }
  if (!candidates.length) return [];

  const dates = [...new Set(occurrences.map(item => item.date).filter(Boolean))];
  const reservations = await reservationRowsForStaff(candidates.map(item => item._id), dates, { shopId, StaffReservationModel });
  return candidates.filter(staff => occurrences.every(occurrence => {
    if (!staffScheduleAllowsOccurrence(staff, rule, occurrence)) return false;
    const buckets = staffBucketsForOccurrence(rule, occurrence);
    return !reservations.some(reservation => {
      if (String(reservation.staffId) !== String(staff._id)) return false;
      const bookingIds = reservation.bookingIds || [];
      const hasOnlyIgnoredBooking = Boolean(ignoreBookingId) && bookingIds.length > 0 && bookingIds.every(id => String(id) === String(ignoreBookingId));
      if (hasOnlyIgnoredBooking) return false;
      return !sameServiceOccurrence(reservation, rule._id, occurrence) && hasBucketOverlap(reservation, buckets);
    });
  }));
}

async function addBookingToStaffOccurrence({ shopId, staff, rule, occurrence, bookingId, StaffReservationModel = StaffReservation }) {
  const identity = { shopId, staffId: staff._id, ruleId: rule._id, slotKey: occurrence.slotKey };
  const existing = await StaffReservationModel.findOne(identity);
  if (existing) {
    await StaffReservationModel.updateOne(identity, { $addToSet: { bookingIds: bookingId } });
    return;
  }
  try {
    await StaffReservationModel.create({
      ...identity,
      date: occurrence.date,
      bookingMode: bookingModeFor(rule),
      bucketKeys: staffBucketsForOccurrence(rule, occurrence),
      bookingIds: [bookingId]
    });
  } catch (error) {
    if (error?.code === 11000) {
      // Two customers can legitimately join the same group/class occurrence. If the
      // exact same staff/service occurrence won the race, reuse it; otherwise this is
      // a true overlap with another service.
      const raced = await StaffReservationModel.findOne(identity);
      if (raced) {
        await StaffReservationModel.updateOne(identity, { $addToSet: { bookingIds: bookingId } });
        return;
      }
      throw new StaffConflictError();
    }
    throw error;
  }
}

export async function releaseStaffReservations({ bookingId, StaffReservationModel = StaffReservation }) {
  if (!bookingId) return;
  await StaffReservationModel.updateMany({ bookingIds: bookingId }, { $pull: { bookingIds: bookingId } });
  await StaffReservationModel.deleteMany({ bookingIds: { $size: 0 } });
}

export async function reserveStaffForBooking({ shopId, rule, occurrences, bookingId, requestedStaffId = '', StaffModel = Staff, StaffReservationModel = StaffReservation }) {
  const assignment = normalizedStaffAssignment(rule);
  if (assignment.mode === 'none' || !assignment.staffIds.length) return null;
  const candidates = await availableStaffForOccurrences({ shopId, rule, occurrences, requestedStaffId, StaffModel, StaffReservationModel });
  if (!candidates.length) {
    if (assignment.mode === 'customer_choice' && !requestedStaffId) throw Object.assign(new Error('Choose a staff member before booking.'), { code: 'VALIDATION_ERROR' });
    throw new StaffConflictError(assignment.mode === 'customer_choice' ? 'The selected staff member is not available for every selected time.' : 'No assigned staff member is available for every selected time.');
  }

  for (const staff of candidates) {
    try {
      for (const occurrence of occurrences) {
        await addBookingToStaffOccurrence({ shopId, staff, rule, occurrence, bookingId, StaffReservationModel });
      }
      return staff;
    } catch (error) {
      await releaseStaffReservations({ bookingId, StaffReservationModel });
      if (error?.code !== 'STAFF_CONFLICT') throw error;
    }
  }
  throw new StaffConflictError();
}

export async function staffAvailabilityForDate({ shopId, rule, date, baseSlots = [], requestedStaffId = '', selectedOccurrences = [], ignoreBookingId = '', StaffModel = Staff, StaffReservationModel = StaffReservation }) {
  const assignment = normalizedStaffAssignment(rule);
  if (assignment.mode === 'none' || !assignment.staffIds.length) return { managed: false, requiresStaffSelection: false, slots: baseSlots, availableAllDay: true };
  if (assignment.mode === 'customer_choice' && !requestedStaffId) return { managed: true, requiresStaffSelection: true, slots: [], availableAllDay: false };

  const mode = bookingModeFor(rule);
  if (mode === 'all_day') {
    const occurrence = { date, time: '', slotKey: `${date}#ALL_DAY` };
    const staff = await availableStaffForOccurrences({ shopId, rule, occurrences: [...selectedOccurrences, occurrence], requestedStaffId, ignoreBookingId, StaffModel, StaffReservationModel });
    return { managed: true, requiresStaffSelection: false, slots: [], availableAllDay: staff.length > 0 };
  }
  const slots = [];
  for (const time of baseSlots) {
    const occurrence = { date, time, slotKey: `${date}T${time}` };
    const staff = await availableStaffForOccurrences({ shopId, rule, occurrences: [...selectedOccurrences, occurrence], requestedStaffId, ignoreBookingId, StaffModel, StaffReservationModel });
    if (staff.length) slots.push(time);
  }
  return { managed: true, requiresStaffSelection: false, slots, availableAllDay: false };
}
