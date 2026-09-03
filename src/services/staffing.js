import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { Staff } from '../models/Staff.js';
import { StaffReservation } from '../models/StaffReservation.js';
import { bookingModeFor, minutesFromTime, windowsForDate, isDateAllowed } from '../lib/slots.js';

const staffAvatarPresetFiles = { aurora:'staff-1.webp', ocean:'staff-2.webp', mint:'staff-3.webp', peach:'staff-4.webp', violet:'staff-5.webp', sunset:'staff-6.webp', sky:'staff-7.webp', rose:'staff-8.webp', nova:'staff-9.webp' };
const staffAvatarPresetData = new Map(Object.entries(staffAvatarPresetFiles).map(([preset, file]) => {
  try {
    const bytes = readFileSync(new URL(`../../public/staff-avatars/${file}`, import.meta.url));
    return [preset, `data:image/webp;base64,${bytes.toString('base64')}`];
  } catch {
    return [preset, ''];
  }
}));

function publicProfileText(value = '') {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (/^(?:select|choose)\s+(?:a\s+)?(?:state|region|location|option)(?:\.\.\.)?$/i.test(normalized)) return '';
  if (/^(?:undefined|null|n\/?a|none)$/i.test(normalized)) return '';
  return normalized;
}

function publicStaffAvatar(avatar = {}) {
  if (avatar.kind === 'custom' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(avatar.value || ''))) return { kind: 'custom', value: avatar.value };
  if (avatar.kind === 'initials') return { kind: 'initials', value: '' };
  const preset = Object.hasOwn(staffAvatarPresetFiles, avatar.value) ? avatar.value : 'aurora';
  const embedded = staffAvatarPresetData.get(preset);
  return embedded ? { kind: 'custom', value: embedded } : { kind: 'preset', value: preset };
}

function publicServiceList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(publicProfileText).filter(Boolean))].slice(0, 12);
}

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
    options: staff.map(item => ({
      id: String(item._id),
      name: publicProfileText(item.name),
      roleTitle: publicProfileText(item.roleTitle),
      expertise: publicProfileText(item.expertise),
      supportedServices: publicServiceList(item.supportedServices),
      bio: publicProfileText(item.bio),
      avatar: publicStaffAvatar(item.avatar?.kind ? item.avatar : { kind: 'preset', value: 'aurora' })
    }))
  };
}

export async function publicStaffDirectory(rule, options = {}) {
  const assignment = normalizedStaffAssignment(rule);
  const staff = await assignedActiveStaff(rule, options);
  return {
    mode: assignment.mode,
    options: staff.filter(item => item.publicProfile === true).map(item => ({
      id: String(item._id), name: publicProfileText(item.name), roleTitle: publicProfileText(item.roleTitle),
      expertise: publicProfileText(item.expertise), supportedServices: publicServiceList(item.supportedServices), bio: publicProfileText(item.bio),
      avatar: publicStaffAvatar(item.avatar?.kind ? item.avatar : { kind: 'preset', value: 'aurora' })
    }))
  };
}

async function reservationRowsForStaff(staffIds, dates, { shopId, StaffReservationModel = StaffReservation } = {}) {
  if (!staffIds.length || !dates.length) return [];
  return StaffReservationModel.find({ shopId, staffId: { $in: staffIds }, date: { $in: dates } }).select('staffId ruleId slotKey date bucketKeys bookingIds').lean();
}

function candidateStaffForAssignment(assignment, active, requestedStaffId = '') {
  if (assignment.mode === 'fixed') return active.filter(item => String(item._id) === assignment.staffIds[0]);
  if (assignment.mode === 'customer_choice') {
    if (!requestedStaffId || !assignment.staffIds.includes(String(requestedStaffId))) return [];
    return active.filter(item => String(item._id) === String(requestedStaffId));
  }
  return active;
}

function availableStaffFromContext({ candidates, reservations, rule, occurrences, ignoreBookingId = '' }) {
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

async function availabilityContext({ shopId, rule, occurrences, requestedStaffId = '', StaffModel = Staff, StaffReservationModel = StaffReservation }) {
  const assignment = normalizedStaffAssignment(rule);
  if (assignment.mode === 'none' || !assignment.staffIds.length) return { assignment, candidates: [], reservations: [] };
  const active = await assignedActiveStaff(rule, { StaffModel });
  const candidates = candidateStaffForAssignment(assignment, active, requestedStaffId);
  if (!candidates.length) return { assignment, candidates: [], reservations: [] };
  const dates = [...new Set(occurrences.map(item => item.date).filter(Boolean))];
  const reservations = await reservationRowsForStaff(candidates.map(item => item._id), dates, { shopId, StaffReservationModel });
  return { assignment, candidates, reservations };
}

export async function availableStaffForOccurrences({ shopId, rule, occurrences, requestedStaffId = '', ignoreBookingId = '', StaffModel = Staff, StaffReservationModel = StaffReservation }) {
  const context = await availabilityContext({ shopId, rule, occurrences, requestedStaffId, StaffModel, StaffReservationModel });
  if (!context.candidates.length) return [];
  return availableStaffFromContext({ ...context, rule, occurrences, ignoreBookingId });
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
  const candidateOccurrences = mode === 'all_day'
    ? [...selectedOccurrences, { date, time: '', slotKey: `${date}#ALL_DAY` }]
    : [...selectedOccurrences, ...baseSlots.map(time => ({ date, time, slotKey: `${date}T${time}` }))];
  const context = await availabilityContext({ shopId, rule, occurrences: candidateOccurrences, requestedStaffId, StaffModel, StaffReservationModel });
  if (!context.candidates.length) return { managed: true, requiresStaffSelection: false, slots: [], availableAllDay: false };

  if (mode === 'all_day') {
    const occurrence = { date, time: '', slotKey: `${date}#ALL_DAY` };
    const staff = availableStaffFromContext({ ...context, rule, occurrences: [...selectedOccurrences, occurrence], ignoreBookingId });
    return { managed: true, requiresStaffSelection: false, slots: [], availableAllDay: staff.length > 0 };
  }

  const slots = [];
  for (const time of baseSlots) {
    const occurrence = { date, time, slotKey: `${date}T${time}` };
    const staff = availableStaffFromContext({ ...context, rule, occurrences: [...selectedOccurrences, occurrence], ignoreBookingId });
    if (staff.length) slots.push(time);
  }
  return { managed: true, requiresStaffSelection: false, slots, availableAllDay: false };
}
