import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRuleInput } from '../src/lib/validation.js';
import { isAllDayBookableDate } from '../src/lib/slots.js';
import { createBookingAtomic } from '../src/services/bookings.js';
import { BookingReservation } from '../src/models/BookingReservation.js';

const shop = { _id: 'shop1', timezone: 'Asia/Shanghai', email: '' };
const customerInput = {
  customer: { name: 'Jane', email: 'jane@example.com', phone: '' },
  note: '',
  answers: []
};
const now = new Date('2026-08-23T16:00:00.000Z'); // 2026-08-24 00:00 Asia/Shanghai

function weekdayRule(overrides = {}) {
  return {
    _id: 'rule1', enabled: true, bookingSource: 'direct', sourceType: 'standalone', serviceType: 'class',
    serviceTitle: 'Workshop', productId: '', productTitle: '', duration: 60, buffer: 0, capacity: 3,
    minimumNoticeMinutes: 0, bookingWindowDays: 90, sessionsRequired: 3,
    location: 'Studio', staff: 'Maya', customQuestions: [],
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '13:00' }] }],
    availabilityExceptions: [],
    ...overrides
  };
}

function reservationStub({ collide = new Set() } = {}) {
  const docs = [];
  return {
    docs,
    async create(document) {
      const key = `${document.slotKey}#${document.slotPosition}`;
      if (collide.has(key)) throw Object.assign(new Error('occupied'), { code: 11000 });
      const created = { _id: `r${docs.length + 1}`, ...document };
      docs.push(created);
      return created;
    },
    async deleteMany(filter) {
      if (!filter?.bookingId) return { deletedCount: 0 };
      const before = docs.length;
      for (let i = docs.length - 1; i >= 0; i -= 1) if (String(docs[i].bookingId) === String(filter.bookingId)) docs.splice(i, 1);
      return { deletedCount: before - docs.length };
    }
  };
}

function bookingStub() {
  const docs = [];
  return {
    docs,
    async create(document) {
      const created = { ...document, _id: document._id || `b${docs.length + 1}` };
      docs.push(created);
      return created;
    }
  };
}

test('all-day rule validation removes time-window-only settings', () => {
  const result = validateRuleInput({
    bookingSource: 'direct', serviceType: 'onsite', serviceTitle: 'Whole-day installation', bookingMode: 'all_day',
    duration: 120, buffer: 30, capacity: 4, minimumNoticeMinutes: 1440, bookingWindowDays: 60,
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }]
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.bookingMode, 'all_day');
  assert.equal(result.value.duration, 60);
  assert.equal(result.value.buffer, 0);
  assert.deepEqual(result.value.weeklyAvailability[0].windows, []);
  assert.equal(result.value.capacity, 4);
});

test('multi-session rules require 2-12 sessions', () => {
  const invalid = validateRuleInput({
    bookingSource: 'direct', serviceType: 'class', serviceTitle: 'Course bundle', bookingMode: 'multi_slot',
    duration: 60, buffer: 0, capacity: 8, sessionsRequired: 1, bookingWindowDays: 90, minimumNoticeMinutes: 0,
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '13:00' }] }]
  });
  assert.match(invalid.errors.join(' '), /2–12 sessions/);

  const valid = validateRuleInput({
    bookingSource: 'direct', serviceType: 'class', serviceTitle: 'Course bundle', bookingMode: 'multi_slot',
    duration: 60, buffer: 0, capacity: 8, sessionsRequired: 4, bookingWindowDays: 90, minimumNoticeMinutes: 0,
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '13:00' }] }]
  });
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.value.sessionsRequired, 4);
});

test('all-day availability uses enabled dates instead of hourly windows', () => {
  const rule = weekdayRule({ bookingMode: 'all_day', minimumNoticeMinutes: 0, weeklyAvailability: [{ weekday: 1, enabled: true, windows: [] }] });
  assert.equal(isAllDayBookableDate(rule, '2026-08-24', 'Asia/Shanghai', now), true);
  assert.equal(isAllDayBookableDate(rule, '2026-08-25', 'Asia/Shanghai', now), false);
});

test('all-day booking reserves a daily capacity position and stores a single occurrence', async () => {
  const rule = weekdayRule({ bookingMode: 'all_day', weeklyAvailability: [{ weekday: 1, enabled: true, windows: [] }] });
  const ReservationModel = reservationStub({ collide: new Set(['2026-08-24#ALL_DAY#0']) });
  const BookingModel = bookingStub();
  const result = await createBookingAtomic({
    shop,
    rule,
    input: { ...customerInput, date: '2026-08-24', time: '', occurrences: [] },
    BookingModel,
    ReservationModel,
    notify: async () => ({ skipped: true }),
    now
  });
  assert.equal(result.booking.bookingMode, 'all_day');
  assert.equal(result.booking.date, '2026-08-24');
  assert.equal(result.booking.time, '00:00');
  assert.equal(result.booking.occurrences.length, 1);
  assert.equal(result.booking.occurrences[0].time, '');
  assert.equal(result.booking.occurrences[0].slotKey, '2026-08-24#ALL_DAY');
  assert.equal(result.booking.occurrences[0].slotPosition, 1);
});

test('multi-session booking reserves every selected occurrence atomically', async () => {
  const rule = weekdayRule({ bookingMode: 'multi_slot', sessionsRequired: 3, weeklyAvailability: [
    { weekday: 1, enabled: true, windows: [{ start: '09:00', end: '13:00' }] },
    { weekday: 3, enabled: true, windows: [{ start: '09:00', end: '13:00' }] },
    { weekday: 5, enabled: true, windows: [{ start: '09:00', end: '13:00' }] }
  ] });
  const ReservationModel = reservationStub();
  const BookingModel = bookingStub();
  const occurrences = [
    { date: '2026-08-24', time: '09:00' },
    { date: '2026-08-26', time: '10:00' },
    { date: '2026-08-28', time: '11:00' }
  ];
  const result = await createBookingAtomic({
    shop,
    rule,
    input: { ...customerInput, date: '', time: '', occurrences },
    BookingModel,
    ReservationModel,
    notify: async () => ({ skipped: true }),
    now
  });
  assert.equal(result.booking.bookingMode, 'multi_slot');
  assert.equal(result.booking.occurrences.length, 3);
  assert.equal(ReservationModel.docs.length, 3);
  assert.deepEqual(result.booking.occurrences.map(item => `${item.date} ${item.time}`), [
    '2026-08-24 09:00', '2026-08-26 10:00', '2026-08-28 11:00'
  ]);
});

test('multi-session booking rejects the wrong number of selected sessions', async () => {
  const rule = weekdayRule({ bookingMode: 'multi_slot', sessionsRequired: 3 });
  await assert.rejects(
    () => createBookingAtomic({
      shop,
      rule,
      input: { ...customerInput, date: '', time: '', occurrences: [{ date: '2026-08-24', time: '09:00' }] },
      BookingModel: bookingStub(),
      ReservationModel: reservationStub(),
      notify: async () => ({ skipped: true }),
      now
    }),
    /exactly 3 sessions/
  );
});

test('booking mode UI is shared across admin, hosted booking, and Theme App Block', async () => {
  const [adminView, adminAsset, adminRoute, bookAsset, themeAsset] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8')
  ]);
  assert.match(adminView, /Minute \/ hour/);
  assert.match(adminView, /All day/);
  assert.match(adminView, /Multiple sessions/);
  assert.match(adminAsset, /function setBookingMode/);
  assert.match(adminAsset, /function bookingOccurrenceDates/);
  assert.match(adminRoute, /function nextOccurrenceForDashboard/);
  assert.match(bookAsset, /bookingMode\(\)/);
  assert.match(bookAsset, /selectedOccurrences/);
  assert.match(themeAsset, /mode === 'all_day'/);
  assert.match(themeAsset, /mode === 'multi_slot'/);
  assert.match(themeAsset, /const finalDate = receipt\?\.bookingMode === 'multi_slot'/);
});

test('reservation schema protects capacity for every occurrence', () => {
  const indexes = BookingReservation.schema.indexes();
  assert.ok(indexes.some(([keys, options]) => keys.slotKey === 1 && keys.slotPosition === 1 && options.unique === true && options.name === 'one_active_reservation_per_capacity_position'));
});
