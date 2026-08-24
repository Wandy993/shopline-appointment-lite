import test from 'node:test';
import assert from 'node:assert/strict';
import { isDateAllowed, slotsForDate, weekdayForDate } from '../src/lib/slots.js';

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
