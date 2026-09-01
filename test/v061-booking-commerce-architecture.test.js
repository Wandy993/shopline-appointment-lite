import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRuleInput } from '../src/lib/validation.js';

const weekly = [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }];
const base = overrides => ({
  bookingSource: 'product', commerceMode: 'product_pre_purchase', serviceType: 'consultation', serviceTitle: 'Design consultation',
  productId: 'gid-product-1', productTitle: 'Modern Sofa', productHandle: 'modern-sofa', duration: 60, buffer: 0, capacity: 1,
  bookingWindowDays: 90, minimumNoticeMinutes: 0, weeklyAvailability: weekly, ...overrides
});

test('v0.6.3 activates all four booking commerce paths', () => {
  const product = validateRuleInput(base({ commerceMode: 'product_pre_purchase' }));
  assert.deepEqual(product.errors, []);
  assert.equal(product.value.commerceMode, 'product_pre_purchase');
  const free = validateRuleInput(base({ commerceMode: 'standalone_free', bookingSource: 'direct', productId: '', productTitle: '', productHandle: '' }));
  assert.deepEqual(free.errors, []);
  assert.equal(free.value.commerceMode, 'standalone_free');
  assert.equal(free.value.productId, '');
  const paid = validateRuleInput(base({ commerceMode: 'standalone_paid', productVariantId: '123456789', productVariantTitle: 'Default', productVariantPrice: '29.00', paymentHoldMinutes: 15 }));
  assert.deepEqual(paid.errors, []);
  assert.equal(paid.value.commerceMode, 'standalone_paid');
  assert.equal(paid.value.productVariantId, '123456789');
  const postPurchase = validateRuleInput(base({ commerceMode: 'product_post_purchase', bookingSource: 'product' }));
  assert.deepEqual(postPurchase.errors, []);
  assert.equal(postPurchase.value.commerceMode, 'product_post_purchase');
  assert.equal(postPurchase.value.bookingSource, 'direct');
});

test('v0.6.2 allows appointment-only SHOPLINE product pages without treating them as product-purchase appointments', () => {
  const result = validateRuleInput(base({ commerceMode: 'standalone_free', bookingSource: 'product' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.commerceMode, 'standalone_free');
  assert.equal(result.value.productId, 'gid-product-1');
});

test('v0.6.2 product-related bookings keep a product binding even when the entry is a direct booking page', () => {
  const result = validateRuleInput(base({ commerceMode: 'product_pre_purchase', bookingSource: 'direct' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.productId, 'gid-product-1');
  const missing = validateRuleInput(base({ commerceMode: 'product_pre_purchase', bookingSource: 'direct', productId: '', productTitle: '' }));
  assert.match(missing.errors.join(' '), /Product is required/);
});

test('legacy commerce fields remain compatible while v0.8.1 uses booking model and placement UI', async () => {
  const [view, app, css] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(view, /id="commerceMode"/);
  assert.match(view, /id="bookingType"/);
  assert.match(view, /data-booking-type="standalone"/);
  assert.match(view, /data-booking-type="purchase_triggered"/);
  assert.match(view, /id="storefrontPlacementFieldset"/);
  assert.match(app, /function setBookingType/);
  assert.match(app, /function placementPayload/);
  assert.match(css, /\.booking-type-grid/);
});

test('v0.6.2 snapshots commerce mode and never hides SHOPLINE buy buttons with storefront DOM hacks', async () => {
  const [ruleModel, bookingModel, bookings, theme] = await Promise.all([
    readFile(new URL('../src/models/AppointmentRule.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/models/Booking.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/bookings.js', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8')
  ]);
  assert.match(ruleModel, /standalone_free.*standalone_paid.*product_pre_purchase.*product_post_purchase/);
  assert.match(bookingModel, /commerceMode/);
  assert.match(bookings, /commerceMode: rule\.commerceMode/);
  assert.doesNotMatch(theme, /querySelector\([^\n]*(?:buy|cart)/i);
  assert.doesNotMatch(theme, /style\.display\s*=\s*['"]none['"][^\n]*(?:buy|cart)/i);
});
