import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRuleInput } from '../src/lib/validation.js';

const weekly = [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }];

function input(overrides = {}) {
  return {
    bookingSource: 'product', serviceType: 'consultation', serviceTitle: 'Interior design consultation',
    productId: 'gid-product-1', productTitle: 'Interior Design Package', productHandle: 'interior-design-package',
    duration: 60, buffer: 15, capacity: 1, bookingWindowDays: 60, minimumNoticeMinutes: 120,
    weeklyAvailability: weekly, ...overrides
  };
}

test('service type is independent from product binding', () => {
  const result = validateRuleInput(input());
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.serviceType, 'consultation');
  assert.equal(result.value.bookingSource, 'product');
  assert.equal(result.value.serviceTitle, 'Interior design consultation');
  assert.equal(result.value.productTitle, 'Interior Design Package');
});

test('both booking source keeps a SHOPLINE binding and a direct booking channel', () => {
  const result = validateRuleInput(input({ bookingSource: 'both', serviceType: 'onsite', serviceTitle: 'Home installation' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.bookingSource, 'both');
  assert.equal(result.value.sourceType, 'product');
  assert.equal(result.value.productId, 'gid-product-1');
});

test('direct booking can exist without a product while keeping the same service types', () => {
  const result = validateRuleInput(input({ bookingSource: 'direct', serviceType: 'class', serviceTitle: 'Weekend workshop', productId: '', productTitle: '', productHandle: '' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.bookingSource, 'direct');
  assert.equal(result.value.sourceType, 'standalone');
  assert.equal(result.value.productId, '');
});

test('product and both sources require a linked SHOPLINE product', () => {
  const result = validateRuleInput(input({ bookingSource: 'both', productId: '', productTitle: '' }));
  assert.match(result.errors.join(' '), /Product is required/);
});

test('admin UI separates service type from booking source and cleans operations surfaces', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(view, /id="bookingSource"/);
  assert.match(view, /data-booking-source="product"/);
  assert.match(view, /data-booking-source="direct"/);
  assert.match(view, /data-booking-source="both"/);
  assert.match(view, /Linked SHOPLINE product/);
  assert.match(app, /bookingSourceLabels/);
  assert.match(app, /rule\.serviceTitle \|\| rule\.productTitle/);
  assert.match(css, /\.service-card\.service-list-row/);
  assert.match(css, /\.booking-filter-main/);
  assert.match(css, /\.preview-mail-shell/);
  assert.match(css, /\.preview-detail-card/);
});

test('public and admin routes expose product, direct, and dual booking channels', async () => {
  const adminRoute = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  const publicRoute = await readFile(new URL('../src/routes/public.js', import.meta.url), 'utf8');
  const bookings = await readFile(new URL('../src/services/bookings.js', import.meta.url), 'utf8');
  const db = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
  assert.match(adminRoute, /\['direct', 'both'\]\.includes\(bookingSource\)/);
  assert.match(publicRoute, /bookingSource: \{ \$in: \['product', 'both'\] \}/);
  assert.match(publicRoute, /\['direct', 'both'\]\.includes\(bookingSource\)/);
  assert.match(bookings, /bookingSource: rule\.bookingSource/);
  assert.match(db, /one_appointment_service_per_product/);
  assert.match(db, /serviceTitle: '\$productTitle'/);
});

test('theme App Block renders the service title and matches the release version', async () => {
  const asset = await readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8');
  const escapedVersion = '0\\.6\\.0\\.2';
  assert.match(asset, /rule\.serviceTitle \|\| rule\.productTitle/);
  assert.match(asset, new RegExp(`const VERSION = '${escapedVersion}'`));
});
