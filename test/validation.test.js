import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAdminBookingInput, validateBookingInput, validateRuleInput } from '../src/lib/validation.js';

test('rule validation accepts a minimal weekday schedule', () => {
  const result = validateRuleInput({
    productId: 'p1', productTitle: 'Consultation', duration: 60, buffer: 15,
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }]
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.enabled, true);
});

test('rule validation rejects reversed time windows', () => {
  const result = validateRuleInput({
    productId: 'p1', productTitle: 'Consultation', duration: 60, buffer: 0,
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '17:00', end: '09:00' }] }]
  });
  assert.match(result.errors.join(' '), /valid start before end/);
});

test('booking validation trims values and validates email', () => {
  const valid = validateBookingInput({ productId: ' p1 ', date: '2026-08-24', time: '09:00', customer: { name: ' Jane ', email: 'JANE@example.com' } });
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.value.customer.email, 'jane@example.com');
  assert.ok(validateBookingInput({ customer: { name: '', email: 'bad' } }).errors.length >= 2);
});

test('admin booking edit validates slot and trims lightweight resources', () => {
  const result = validateAdminBookingInput({ date: '2026-08-24', time: '10:00', location: ' Room B ', staff: ' Alex ' });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.value, { date: '2026-08-24', time: '10:00', location: 'Room B', staff: 'Alex', staffId: '' });
});
