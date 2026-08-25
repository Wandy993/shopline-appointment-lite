import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AppointmentRule } from '../src/models/AppointmentRule.js';
import { Booking } from '../src/models/Booking.js';
import { filterSlotsByCapacity, futureSlotsForDate, slotsForDate } from '../src/lib/slots.js';
import { validateBookingStatus, validateRuleInput } from '../src/lib/validation.js';
import { createBookingAtomic, setBookingStatusByMerchant, SlotConflictError } from '../src/services/bookings.js';

const baseRule = {
  _id: 'rule1', enabled: true, sourceType: 'standalone', serviceType: 'class', productId: '', productTitle: 'Weekend pottery class',
  duration: 60, buffer: 0, capacity: 2, minimumNoticeMinutes: 0, bookingWindowDays: 90,
  location: 'Studio A', staff: 'Maya', customQuestions: [],
  weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '12:00' }] }]
};
const shop = { _id: 'shop1', timezone: 'Asia/Shanghai', email: '' };
const input = { date: '2026-08-24', time: '09:00', customer: { name: 'Jane', email: 'jane@example.com', phone: '' }, note: '', answers: [] };
const beforeOpening = new Date('2026-08-23T16:00:00.000Z');

test('availability exceptions close regular days and open normally closed days', () => {
  const rule = {
    ...baseRule,
    availabilityExceptions: [
      { date: '2026-08-24', closed: true, windows: [] },
      { date: '2026-08-25', closed: false, windows: [{ start: '14:00', end: '16:00' }] }
    ]
  };
  assert.deepEqual(slotsForDate(rule, '2026-08-24'), []);
  assert.deepEqual(slotsForDate(rule, '2026-08-25'), ['14:00', '15:00']);
});

test('minimum notice and booking window are enforced in store-local scheduling', () => {
  const rule = {
    ...baseRule,
    minimumNoticeMinutes: 120,
    bookingWindowDays: 2,
    weeklyAvailability: [
      { weekday: 1, enabled: true, windows: [{ start: '09:00', end: '13:00' }] },
      { weekday: 3, enabled: true, windows: [{ start: '09:00', end: '13:00' }] }
    ]
  };
  const now = new Date('2026-08-24T00:00:00.000Z'); // 08:00 Asia/Shanghai
  assert.deepEqual(futureSlotsForDate(rule, '2026-08-24', 'Asia/Shanghai', now), ['10:00', '11:00', '12:00']);
  assert.deepEqual(futureSlotsForDate(rule, '2026-08-27', 'Asia/Shanghai', now), []);
});

test('capacity keeps a slot available until all positions are occupied', () => {
  const slots = ['09:00', '10:00'];
  assert.deepEqual(filterSlotsByCapacity(slots, [{ time: '09:00' }], 2), ['09:00', '10:00']);
  assert.deepEqual(filterSlotsByCapacity(slots, [{ time: '09:00' }, { time: '09:00' }], 2), ['10:00']);
});

test('capacity-safe booking allocation retries the next slot position', async () => {
  const attempts = [];
  const BookingModel = {
    async create(document) {
      attempts.push(document.slotPosition);
      if (document.slotPosition === 0) throw Object.assign(new Error('occupied'), { code: 11000 });
      return { _id: 'b2', ...document };
    }
  };
  const result = await createBookingAtomic({ shop, rule: baseRule, input, BookingModel, notify: async () => ({ skipped: true }), now: beforeOpening });
  assert.deepEqual(attempts, [0, 1]);
  assert.equal(result.booking.slotPosition, 1);
  assert.equal(result.booking.sourceType, 'standalone');
  assert.equal(result.booking.serviceType, 'class');
});

test('capacity-safe booking allocation rejects only after every position is occupied', async () => {
  const BookingModel = { async create() { throw Object.assign(new Error('occupied'), { code: 11000 }); } };
  await assert.rejects(
    () => createBookingAtomic({ shop, rule: baseRule, input, BookingModel, notify: async () => ({ skipped: true }), now: beforeOpening }),
    SlotConflictError
  );
});

test('standalone services can use one-off availability without a weekly schedule', () => {
  const result = validateRuleInput({
    sourceType: 'standalone', serviceType: 'class', serviceTitle: 'One-day workshop', duration: 90, buffer: 15, capacity: 8,
    bookingWindowDays: 30, minimumNoticeMinutes: 60, weeklyAvailability: [],
    availabilityExceptions: [{ date: '2026-09-12', closed: false, windows: [{ start: '10:00', end: '14:00' }] }]
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.productId, '');
  assert.equal(result.value.productTitle, 'One-day workshop');
  assert.equal(result.value.capacity, 8);
});

test('rule validation rejects invalid capacity and scheduling policy', () => {
  const result = validateRuleInput({
    sourceType: 'standalone', serviceType: 'onsite', serviceTitle: 'Installation', duration: 60, buffer: 0, capacity: 0,
    bookingWindowDays: 500, minimumNoticeMinutes: 20000,
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }]
  });
  assert.match(result.errors.join(' '), /Capacity/);
  assert.match(result.errors.join(' '), /Booking window/);
  assert.match(result.errors.join(' '), /Minimum notice/);
});

test('merchant completion and no-show are validated and recorded in booking history', async () => {
  assert.deepEqual(validateBookingStatus('completed').errors, []);
  assert.ok(validateBookingStatus('cancelled').errors.length);
  let update;
  const current = { _id: 'b1', shopId: 'shop1', status: 'confirmed', slotKey: '2026-08-24T09:00', date: '2026-08-24', time: '09:00', location: '', staff: '' };
  const BookingModel = {
    async findOne() { return current; },
    async findOneAndUpdate(filter, value) { update = value; return { ...current, ...value.$set }; }
  };
  const completed = await setBookingStatusByMerchant({ shopObjectId: 'shop1', bookingId: 'b1', status: 'completed', BookingModel, now: beforeOpening });
  assert.equal(completed.status, 'completed');
  assert.equal(update.$push.events.type, 'merchant_completed');
});

test('schemas expose partial product uniqueness and capacity-position uniqueness', () => {
  const ruleIndexes = AppointmentRule.schema.indexes();
  const bookingIndexes = Booking.schema.indexes();
  assert.ok(ruleIndexes.some(([keys, options]) => keys.shopId === 1 && keys.productId === 1 && options.name === 'one_rule_per_product' && options.partialFilterExpression?.sourceType === 'product'));
  assert.ok(bookingIndexes.some(([keys, options]) => keys.slotPosition === 1 && options.name === 'capacity_position_per_slot' && options.partialFilterExpression?.status === 'confirmed'));
});

test('admin and hosted booking UI expose Scheduling Operations service types', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const adminAsset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const bookView = await readFile(new URL('../src/views/book.js', import.meta.url), 'utf8');
  const bookAsset = await readFile(new URL('../public/book/app.js', import.meta.url), 'utf8');
  assert.match(view, /SCHEDULING OPERATIONS/);
  assert.match(view, /Home \/ onsite service/);
  assert.match(view, /Class \/ course/);
  assert.match(view, /id="bookingCalendar"/);
  assert.match(adminAsset, /exportBookingsCsv/);
  assert.match(adminAsset, /availabilityExceptions/);
  assert.match(bookView, /data-rule-id/);
  assert.match(bookAsset, /\/api\/public\/service\?ruleId=/);
});

test('theme App Block honors the booking-window max date and stays Arctic Blue', async () => {
  const asset = await readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../theme-extension-source/public/appointment-lite.css', import.meta.url), 'utf8');
  assert.match(asset, /bookingWindowUntil/);
  assert.match(asset, /const VERSION = '0\.3\.0'/);
  assert.match(asset, /#2F6FED/);
  assert.match(stylesheet, /--al-accent:#2f6fed/);
});
