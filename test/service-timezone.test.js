import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveRuleTimezone } from '../src/lib/slots.js';
import { validateRuleInput } from '../src/lib/validation.js';

const baseRule = { bookingSource:'direct', serviceTitle:'Remote consultation', bookingMode:'slot', duration:60, buffer:0, capacity:1, weeklyAvailability:[{ weekday:1, enabled:true, windows:[{ start:'09:00', end:'17:00' }] }] };

test('service time zone validates as IANA and falls back to store time zone', () => {
  const valid = validateRuleInput({ ...baseRule, timezone:'America/New_York' });
  assert.deepEqual(valid.errors, []); assert.equal(valid.value.timezone, 'America/New_York');
  const invalid = validateRuleInput({ ...baseRule, timezone:'Mars/Olympus' });
  assert.match(invalid.errors.join(' '), /valid IANA service time zone/);
  assert.equal(resolveRuleTimezone({ timezone:'America/New_York' }, 'Asia/Shanghai'), 'America/New_York');
  assert.equal(resolveRuleTimezone({ timezone:'' }, 'Asia/Shanghai'), 'Asia/Shanghai');
});

test('public availability and booking creation resolve service time zone', async () => {
  const [routes, bookings, adminView, adminApp] = await Promise.all([readFile(new URL('../src/routes/public.js', import.meta.url),'utf8'),readFile(new URL('../src/services/bookings.js', import.meta.url),'utf8'),readFile(new URL('../src/views/admin.js', import.meta.url),'utf8'),readFile(new URL('../public/admin/app.js', import.meta.url),'utf8')]);
  assert.match(routes, /resolveRuleTimezone\(result\.rule, result\.shop\.timezone \|\| 'UTC'\)/);
  assert.match(bookings, /resolveRuleTimezone\(rule, shop\.timezone \|\| 'UTC'\)/);
  assert.match(adminView, /id="serviceTimezone"/);
  assert.match(adminApp, /timezone: \$\('#serviceTimezone'\)\.value\.trim\(\)/);
});
