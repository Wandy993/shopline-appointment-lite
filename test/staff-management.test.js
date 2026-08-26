import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { validateRuleInput, validateStaffInput } from '../src/lib/validation.js';
import { StaffReservation } from '../src/models/StaffReservation.js';
import {
  StaffConflictError,
  normalizedStaffAssignment,
  reserveStaffForBooking,
  staffAvailabilityForDate,
  staffBucketsForOccurrence,
  staffScheduleAllowsOccurrence
} from '../src/services/staffing.js';

const oid = () => new mongoose.Types.ObjectId();
const shopId = oid();
const ruleId = oid();
const monday = [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }];
const wednesday = [{ weekday: 3, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }];

function rule(overrides = {}) {
  return {
    _id: ruleId, shopId, serviceTitle: 'Design consultation', bookingMode: 'slot', duration: 60, buffer: 15,
    staffAssignment: { mode: 'any', staffIds: [] },
    ...overrides
  };
}

function staff(id, name, weeklyAvailability = monday) {
  return { _id: id, shopId, name, email: `${name.toLowerCase()}@example.com`, status: 'active', weeklyAvailability, availabilityExceptions: [] };
}

function staffModel(items) {
  return {
    find(filter) {
      return {
        async lean() {
          const wanted = new Set((filter._id?.$in || []).map(String));
          return items.filter(item => wanted.has(String(item._id)) && String(item.shopId) === String(filter.shopId) && item.status === filter.status);
        }
      };
    }
  };
}

function reservationModel() {
  const docs = [];
  const matches = (doc, filter) => Object.entries(filter || {}).every(([key, value]) => {
    if (key === 'bookingIds') return Array.isArray(doc.bookingIds) && doc.bookingIds.some(id => String(id) === String(value));
    return String(doc[key]) === String(value);
  });
  return {
    docs,
    find(filter) {
      const query = {
        select() { return query; },
        async lean() {
          const staffIds = new Set((filter.staffId?.$in || []).map(String));
          const dates = new Set(filter.date?.$in || []);
          return docs.filter(doc => String(doc.shopId) === String(filter.shopId) && staffIds.has(String(doc.staffId)) && dates.has(doc.date)).map(doc => ({ ...doc }));
        }
      };
      return query;
    },
    async findOne(filter) { return docs.find(doc => matches(doc, filter)) || null; },
    async create(document) {
      const exact = docs.find(doc => String(doc.shopId) === String(document.shopId) && String(doc.staffId) === String(document.staffId) && String(doc.ruleId) === String(document.ruleId) && doc.slotKey === document.slotKey);
      if (exact) throw Object.assign(new Error('duplicate occurrence'), { code: 11000 });
      const wanted = new Set(document.bucketKeys || []);
      const conflict = docs.find(doc => String(doc.shopId) === String(document.shopId) && String(doc.staffId) === String(document.staffId) && (doc.bucketKeys || []).some(key => wanted.has(key)));
      if (conflict) throw Object.assign(new Error('overlap'), { code: 11000 });
      const created = { _id: oid(), ...document, bookingIds: [...(document.bookingIds || [])] };
      docs.push(created);
      return created;
    },
    async updateOne(filter, update) {
      const doc = docs.find(item => matches(item, filter));
      if (doc && update.$addToSet?.bookingIds && !doc.bookingIds.some(id => String(id) === String(update.$addToSet.bookingIds))) doc.bookingIds.push(update.$addToSet.bookingIds);
      return { matchedCount: doc ? 1 : 0 };
    },
    async updateMany(filter, update) {
      for (const doc of docs.filter(item => matches(item, filter))) {
        if (update.$pull?.bookingIds) doc.bookingIds = doc.bookingIds.filter(id => String(id) !== String(update.$pull.bookingIds));
      }
      return { acknowledged: true };
    },
    async deleteMany(filter) {
      if (filter.bookingIds?.$size === 0) {
        for (let i = docs.length - 1; i >= 0; i -= 1) if (!docs[i].bookingIds.length) docs.splice(i, 1);
      }
      return { acknowledged: true };
    }
  };
}

test('staff validation requires a name and at least one working day or open exception', () => {
  const valid = validateStaffInput({ name: 'Sarah', email: 'SARAH@example.com', status: 'active', weeklyAvailability: monday });
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.value.email, 'sarah@example.com');
  const invalid = validateStaffInput({ name: '', weeklyAvailability: [] });
  assert.match(invalid.errors.join(' '), /name/i);
  assert.match(invalid.errors.join(' '), /workday/i);
});

test('service rule validation keeps staff assignment independent from service and booking modes', () => {
  const staffId = String(oid());
  const result = validateRuleInput({
    bookingSource: 'direct', serviceType: 'onsite', serviceTitle: 'Home installation', bookingMode: 'all_day',
    capacity: 1, minimumNoticeMinutes: 1440, bookingWindowDays: 30,
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [] }],
    staffAssignment: { mode: 'fixed', staffIds: [staffId] }
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.value.staffAssignment, { mode: 'fixed', staffIds: [staffId] });
  assert.deepEqual(normalizedStaffAssignment(result.value), { mode: 'fixed', staffIds: [staffId] });
});

test('staff work windows include service buffer when deciding availability', () => {
  const staffId = oid();
  const member = staff(staffId, 'Sarah');
  const service = rule({ staffAssignment: { mode: 'fixed', staffIds: [staffId] } });
  assert.equal(staffScheduleAllowsOccurrence(member, service, { date: '2026-08-24', time: '15:45' }), true);
  assert.equal(staffScheduleAllowsOccurrence(member, service, { date: '2026-08-24', time: '16:00' }), false);
  assert.equal(staffBucketsForOccurrence(service, { date: '2026-08-24', time: '10:00' }).length, 15);
});

test('same service occurrence can share one staff reservation for group capacity', async () => {
  const staffId = oid();
  const StaffModel = staffModel([staff(staffId, 'Maya')]);
  const StaffReservationModel = reservationModel();
  const service = rule({ staffAssignment: { mode: 'fixed', staffIds: [staffId] } });
  const occurrence = { date: '2026-08-24', time: '10:00', slotKey: '2026-08-24T10:00' };
  const first = await reserveStaffForBooking({ shopId, rule: service, occurrences: [occurrence], bookingId: oid(), StaffModel, StaffReservationModel });
  const secondBooking = oid();
  const second = await reserveStaffForBooking({ shopId, rule: service, occurrences: [occurrence], bookingId: secondBooking, StaffModel, StaffReservationModel });
  assert.equal(String(first._id), String(staffId));
  assert.equal(String(second._id), String(staffId));
  assert.equal(StaffReservationModel.docs.length, 1);
  assert.equal(StaffReservationModel.docs[0].bookingIds.length, 2);
});

test('overlapping different services cannot assign the same staff member', async () => {
  const staffId = oid();
  const StaffModel = staffModel([staff(staffId, 'Tim')]);
  const StaffReservationModel = reservationModel();
  const firstRule = rule({ _id: oid(), staffAssignment: { mode: 'fixed', staffIds: [staffId] } });
  const secondRule = rule({ _id: oid(), staffAssignment: { mode: 'fixed', staffIds: [staffId] } });
  await reserveStaffForBooking({ shopId, rule: firstRule, occurrences: [{ date: '2026-08-24', time: '10:00', slotKey: '2026-08-24T10:00' }], bookingId: oid(), StaffModel, StaffReservationModel });
  await assert.rejects(
    () => reserveStaffForBooking({ shopId, rule: secondRule, occurrences: [{ date: '2026-08-24', time: '10:30', slotKey: '2026-08-24T10:30' }], bookingId: oid(), StaffModel, StaffReservationModel }),
    StaffConflictError
  );
});

test('multi-session any-staff assignment selects one member available for every occurrence', async () => {
  const sarahId = oid();
  const timId = oid();
  const sarah = staff(sarahId, 'Sarah', [...monday, ...wednesday]);
  const tim = staff(timId, 'Tim', monday);
  const StaffModel = staffModel([sarah, tim]);
  const StaffReservationModel = reservationModel();
  const service = rule({ bookingMode: 'multi_slot', staffAssignment: { mode: 'any', staffIds: [timId, sarahId] } });
  const assigned = await reserveStaffForBooking({
    shopId, rule: service,
    occurrences: [
      { date: '2026-08-24', time: '10:00', slotKey: '2026-08-24T10:00' },
      { date: '2026-08-26', time: '10:00', slotKey: '2026-08-26T10:00' }
    ],
    bookingId: oid(), StaffModel, StaffReservationModel
  });
  assert.equal(String(assigned._id), String(sarahId));
  assert.equal(StaffReservationModel.docs.length, 2);
  assert.ok(StaffReservationModel.docs.every(doc => String(doc.staffId) === String(sarahId)));
});

test('customer-choice availability waits for a staff selection and then filters slots', async () => {
  const staffId = oid();
  const StaffModel = staffModel([staff(staffId, 'Sarah')]);
  const StaffReservationModel = reservationModel();
  const service = rule({ staffAssignment: { mode: 'customer_choice', staffIds: [staffId] } });
  const waiting = await staffAvailabilityForDate({ shopId, rule: service, date: '2026-08-24', baseSlots: ['10:00'], StaffModel, StaffReservationModel });
  assert.equal(waiting.requiresStaffSelection, true);
  assert.deepEqual(waiting.slots, []);
  const ready = await staffAvailabilityForDate({ shopId, rule: service, date: '2026-08-24', baseSlots: ['10:00', '16:00'], requestedStaffId: String(staffId), StaffModel, StaffReservationModel });
  assert.deepEqual(ready.slots, ['10:00']);
});

test('StaffReservation schema protects one service occurrence and overlapping staff buckets', () => {
  const indexes = StaffReservation.schema.indexes();
  assert.ok(indexes.some(([keys, options]) => keys.staffId === 1 && keys.ruleId === 1 && keys.slotKey === 1 && options.unique && options.name === 'one_staff_reservation_per_service_occurrence'));
  assert.ok(indexes.some(([keys, options]) => keys.staffId === 1 && keys.bucketKeys === 1 && options.unique && options.name === 'no_overlapping_staff_time_buckets'));
});

test('admin, hosted booking, and Theme App Block expose staff management and customer choice', async () => {
  const [view, admin, hosted, theme, styles] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(view, /navButton\('staff', 'Staff'/);
  assert.match(view, /Any available staff/);
  assert.match(view, /Customer chooses/);
  assert.match(view, /Fixed staff/);
  assert.match(admin, /function renderStaff\(/);
  assert.match(admin, /staffAssignment: currentStaffAssignment\(\)/);
  assert.match(hosted, /selectedStaffId/);
  assert.match(theme, /selectedStaffId/);
  assert.match(styles, /v0\.5\.0 — Staff Management Foundation/);
});

test('staff administration protects service assignments and booking view loads staff context', async () => {
  const [routes, admin] = await Promise.all([
    readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8')
  ]);
  assert.match(routes, /STAFF_ASSIGNED_TO_SERVICES/);
  assert.match(routes, /BookingReservation\.deleteMany\(\{ ruleId: rule\._id, shopId: req\.shop\._id \}\)/);
  assert.match(routes, /StaffReservation\.deleteMany\(\{ ruleId: rule\._id, shopId: req\.shop\._id \}\)/);
  assert.match(admin, /if \(name === 'bookings'\) Promise\.all\(\[ensureStaff\(\), loadRules\(\), loadBookings\(\)\]\);/);
});

test('editing one booking does not ignore a shared staff reservation that still contains other customers', async () => {
  const staffId = oid();
  const editingBookingId = oid();
  const otherBookingId = oid();
  const StaffModel = staffModel([staff(staffId, 'Maya')]);
  const StaffReservationModel = reservationModel();
  const oldRule = rule({ _id: oid(), staffAssignment: { mode: 'fixed', staffIds: [staffId] } });
  await reserveStaffForBooking({
    shopId, rule: oldRule,
    occurrences: [{ date: '2026-08-24', time: '10:00', slotKey: '2026-08-24T10:00' }],
    bookingId: editingBookingId, StaffModel, StaffReservationModel
  });
  await reserveStaffForBooking({
    shopId, rule: oldRule,
    occurrences: [{ date: '2026-08-24', time: '10:00', slotKey: '2026-08-24T10:00' }],
    bookingId: otherBookingId, StaffModel, StaffReservationModel
  });
  const newRule = rule({ _id: oid(), staffAssignment: { mode: 'fixed', staffIds: [staffId] } });
  const candidates = await staffAvailabilityForDate({
    shopId, rule: newRule, date: '2026-08-24', baseSlots: ['10:30'],
    requestedStaffId: String(staffId), ignoreBookingId: editingBookingId,
    StaffModel, StaffReservationModel
  });
  assert.deepEqual(candidates.slots, []);
});

test('staff profiles accept lightweight avatars and opt-in assignment emails', () => {
  const preset = validateStaffInput({
    name: 'Sarah', email: 'sarah@example.com', avatar: { kind: 'preset', value: 'mint' },
    notifications: { emailEnabled: true }, weeklyAvailability: monday
  });
  assert.deepEqual(preset.errors, []);
  assert.deepEqual(preset.value.avatar, { kind: 'preset', value: 'mint' });
  assert.equal(preset.value.notifications.emailEnabled, true);

  const custom = validateStaffInput({
    name: 'Tim', email: 'tim@example.com', avatar: { kind: 'custom', value: `data:image/webp;base64,${'A'.repeat(2000)}` },
    notifications: { emailEnabled: false }, weeklyAvailability: monday
  });
  assert.deepEqual(custom.errors, []);
  assert.equal(custom.value.avatar.kind, 'custom');
  assert.equal(custom.value.notifications.emailEnabled, false);

  const tooLarge = validateStaffInput({
    name: 'Alex', avatar: { kind: 'custom', value: `data:image/jpeg;base64,${'A'.repeat(46000)}` }, weeklyAvailability: monday
  });
  assert.match(tooLarge.errors.join(' '), /avatar/i);
});

test('public staff options expose avatar metadata without leaking contact details', async () => {
  const { publicStaffOptions } = await import('../src/services/staffing.js');
  const staffId = oid();
  const service = rule({ staffAssignment: { mode: 'customer_choice', staffIds: [staffId] } });
  const StaffModel = staffModel([{ ...staff(staffId, 'Sarah'), avatar: { kind: 'preset', value: 'ocean' }, phone: 'secret', notifications: { emailEnabled: true } }]);
  const result = await publicStaffOptions(service, { StaffModel });
  assert.equal(result.mode, 'customer_choice');
  assert.deepEqual(result.options, [{ id: String(staffId), name: 'Sarah', avatar: { kind: 'preset', value: 'ocean' } }]);
  assert.equal('email' in result.options[0], false);
  assert.equal('phone' in result.options[0], false);
});

test('staff operations and avatar controls are exposed in the merchant admin', async () => {
  const [view, admin, routes, styles] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(view, /staffAvatarPresets/);
  assert.match(view, /Upload image/);
  assert.match(view, /staffEmailNotifications/);
  assert.match(view, /staffOperationsList/);
  assert.match(admin, /function processStaffAvatarFile/);
  assert.match(admin, /function loadStaffOperations/);
  assert.match(routes, /adminRouter\.get\('\/staff\/operations'/);
  assert.match(styles, /Staff Notifications \+ Staff Operations/);
});

test('storefront staff choice uses Appointment Lite picker instead of native select', async () => {
  const [hostedView, hostedApp, hostedStyles, theme, themeStyles] = await Promise.all([
    readFile(new URL('../src/views/book.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.css', import.meta.url), 'utf8')
  ]);
  assert.match(hostedView, /class="staff-picker"/);
  assert.match(hostedView, /type="hidden"/);
  assert.doesNotMatch(hostedView, /<select[^>]+staff/i);
  assert.match(hostedApp, /function renderStaffPicker/);
  assert.match(hostedStyles, /\.staff-picker-menu/);
  assert.match(theme, /class="al-staff-picker"/);
  assert.doesNotMatch(theme, /<select[^>]+al-staff/i);
  assert.match(themeStyles, /\.al-staff-menu/);
});

test('booking lifecycle wires assignment, update, reassignment, and cancellation emails for staff', async () => {
  const [emailSource, bookingSource] = await Promise.all([
    readFile(new URL('../src/services/email.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/bookings.js', import.meta.url), 'utf8')
  ]);
  assert.match(emailSource, /sendStaffAssignedNotification/);
  assert.match(emailSource, /sendStaffBookingUpdatedNotification/);
  assert.match(emailSource, /sendStaffCancelledNotification/);
  assert.match(emailSource, /notifications\?\.emailEnabled !== true/);
  assert.match(bookingSource, /sendStaffAssignedNotification\(booking/);
  assert.match(bookingSource, /sendStaffBookingUpdatedNotification\(updated, booking\)/);
  assert.match(bookingSource, /sendStaffCancelledNotification\(booking\)/);
});
