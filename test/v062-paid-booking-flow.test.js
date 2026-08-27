import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { buildPaidBookingCheckoutUrl, appointmentLiteBookingIdFromOrder } from '../src/lib/paid-checkout.js';
import { verifyShoplineWebhookSignature } from '../src/lib/shopline-webhook.js';
import { validateRuleInput } from '../src/lib/validation.js';

const weekly = [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }];

function paidRule(overrides = {}) {
  return {
    bookingSource: 'direct', commerceMode: 'standalone_paid', serviceType: 'class', serviceTitle: 'Paid class',
    productId: '1234567890', productTitle: 'Paid class checkout', productHandle: 'paid-class',
    productVariantId: '9876543210', productVariantTitle: 'Default', productVariantPrice: '29.00', paymentHoldMinutes: 15,
    duration: 60, buffer: 0, capacity: 1, bookingWindowDays: 90, minimumNoticeMinutes: 0, weeklyAvailability: weekly,
    ...overrides
  };
}

test('v0.6.2 activates standalone paid booking with a checkout variant and bounded hold window', () => {
  const result = validateRuleInput(paidRule());
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.commerceMode, 'standalone_paid');
  assert.equal(result.value.productVariantId, '9876543210');
  assert.equal(result.value.paymentHoldMinutes, 15);
  assert.match(validateRuleInput(paidRule({ productVariantId: '' })).errors.join(' '), /variant/i);
  assert.match(validateRuleInput(paidRule({ paymentHoldMinutes: 31 })).errors.join(' '), /5–30/);
});

test('v0.6.2 builds a SHOPLINE permanent checkout link with hidden booking identity and customer checkout data', () => {
  const booking = {
    _id: '68ae9ef1909a37bde10eee42', bookingMode: 'slot', date: '2026-08-28', time: '14:00', timezone: 'Asia/Shanghai',
    staff: 'Sarah', customer: { email: 'jane@example.com', phone: '+6599990000' }
  };
  const checkoutUrl = buildPaidBookingCheckoutUrl({ handle: 'apptest', variantId: '9876543210', booking });
  const url = new URL(checkoutUrl);
  assert.equal(url.hostname, 'apptest.myshopline.com');
  assert.equal(url.pathname, '/cart/9876543210:1');
  assert.equal(url.searchParams.get('checkout[email]'), 'jane@example.com');
  const properties = JSON.parse(Buffer.from(url.searchParams.get('properties[0]'), 'base64url').toString('utf8'));
  assert.equal(properties.find(item => item.name === '_appointment_lite_booking')?.value, booking._id);
  assert.equal(properties.find(item => item.name === '_appointment_lite_booking')?.roleVisibility, 'none');
});

test('v0.6.2 finds the held booking from SHOPLINE order line-item properties', () => {
  const id = '68ae9ef1909a37bde10eee42';
  assert.equal(appointmentLiteBookingIdFromOrder({ line_items: [{ properties: [{ name: '_appointment_lite_booking', value: id }] }] }), id);
  assert.equal(appointmentLiteBookingIdFromOrder({ line_items: [{ properties: [{ name: 'Other', value: id }] }] }), '');
});

test('v0.6.2 verifies SHOPLINE webhook raw-body HMAC in documented hex and observed base64 forms', () => {
  const secret = 'test-secret';
  const raw = Buffer.from('{"id":"123"}');
  const digest = createHmac('sha256', secret).update(raw).digest();
  assert.equal(verifyShoplineWebhookSignature(raw, digest.toString('hex'), secret), true);
  assert.equal(verifyShoplineWebhookSignature(raw, digest.toString('base64'), secret), true);
  assert.equal(verifyShoplineWebhookSignature(raw, 'bad', secret), false);
});

test('v0.6.2 wires paid hold, checkout redirect, payment webhooks and hold expiry into runtime', async () => {
  const [publicRoutes, bookingService, webhookRoute, app, server, hosted, theme, admin, adminRoutes, model, receipt, shopline] = await Promise.all([
    readFile(new URL('../src/routes/public.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/bookings.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/shopline-webhooks.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/server.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/models/Booking.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/models/WebhookReceipt.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/shopline.js', import.meta.url), 'utf8')
  ]);
  assert.match(publicRoutes, /post\('\/paid-bookings'/);
  assert.match(bookingService, /initialStatus: 'pending_payment'/);
  assert.match(bookingService, /confirmPaidBooking/);
  assert.match(bookingService, /expirePendingPaidBookings/);
  assert.match(webhookRoute, /orders\/create/);
  assert.match(webhookRoute, /order_transactions\/create/);
  assert.match(app, /express\.raw/);
  assert.match(server, /startPaidBookingScheduler/);
  assert.match(hosted, /\/api\/public\/paid-bookings/);
  assert.match(hosted, /window\.location\.assign\(payload\.checkoutUrl\)/);
  assert.match(theme, /\/api\/public\/paid-bookings/);
  assert.match(theme, /Continue to checkout/);
  assert.match(admin, /id="paidVariantSelect"/);
  assert.match(model, /pending_payment/);
  assert.match(model, /payment_expired/);
  assert.match(model, /payment_conflict/);
  assert.match(receipt, /externalId/);
  assert.match(shopline, /shoplineGet\(shopId, 'webhooks\.json'\)/);
  assert.match(shopline, /existing\.find/);
  assert.match(shopline, /orders\/create/);
  assert.match(shopline, /order_transactions\/create/);
  assert.match(adminRoutes, /(?:PAID_CHECKOUT_SETUP_FAILED|COMMERCE_WEBHOOK_SETUP_FAILED)/);
});
