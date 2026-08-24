import test from 'node:test';
import assert from 'node:assert/strict';
import { futureSlotsForDate, isDateAllowed, isFutureSlot, slotsForDate, weekdayForDate, zonedNow } from '../src/lib/slots.js';

const rule = {
  duration: 60,
  buffer: 15,
  dateFrom: '2026-08-01',
  dateUntil: '2026-08-31',
  weeklyAvailability: [
    { weekday: 1, enabled: true, windows: [{ start: '09:00', end: '13:00' }] },
    { weekday: 2, enabled: false, windows: [{ start: '09:00', end: '13:00' }] }
  ]
};

test('weekday uses stable UTC noon parsing', () => {
  assert.equal(weekdayForDate('2026-08-24'), 1);
  assert.equal(Number.isNaN(weekdayForDate('2026-02-30')), true);
});

test('date range and enabled weekday are enforced', () => {
  assert.equal(isDateAllowed(rule, '2026-08-24'), true);
  assert.equal(isDateAllowed(rule, '2026-08-25'), false);
  assert.equal(isDateAllowed(rule, '2026-09-07'), false);
});

test('duration and buffer produce deterministic slots', () => {
  assert.deepEqual(slotsForDate(rule, '2026-08-24'), ['09:00', '10:15', '11:30']);
});

test('past slots are filtered using the store time zone rather than the customer device time zone', () => {
  const now = new Date('2026-08-24T10:30:00.000Z');
  const sameDayRule = {
    duration: 60, buffer: 0,
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '21:00' }] }]
  };
  assert.deepEqual(zonedNow('Asia/Shanghai', now), { date: '2026-08-24', time: '18:30' });
  assert.equal(isFutureSlot('2026-08-24', '18:00', 'Asia/Shanghai', now), false);
  assert.equal(isFutureSlot('2026-08-24', '19:00', 'Asia/Shanghai', now), true);
  assert.deepEqual(futureSlotsForDate(sameDayRule, '2026-08-24', 'Asia/Shanghai', now), ['19:00', '20:00']);
});
