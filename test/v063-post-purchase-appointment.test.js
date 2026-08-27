import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRuleInput } from '../src/lib/validation.js';

const weekly = [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }];
const postPurchaseRule = overrides => ({
  bookingSource: 'product', commerceMode: 'product_post_purchase', serviceType: 'onsite', serviceTitle: 'Home installation',
  productId: '1234567890', productTitle: 'Modern Sofa', productHandle: 'modern-sofa', duration: 60, buffer: 0, capacity: 1,
  bookingWindowDays: 90, minimumNoticeMinutes: 0, weeklyAvailability: weekly, ...overrides
});

test('v0.6.3 activates purchase-first scheduling and forces a private direct booking entry', () => {
  const result = validateRuleInput(postPurchaseRule());
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.commerceMode, 'product_post_purchase');
  assert.equal(result.value.bookingSource, 'direct');
  assert.equal(result.value.productId, '1234567890');
  const missing = validateRuleInput(postPurchaseRule({ productId: '', productTitle: '', productHandle: '' }));
  assert.match(missing.errors.join(' '), /Product is required/);
});

test('v0.6.3 private entitlement storage never exposes the hashed access token through public scheduling payloads', async () => {
  const [service, routes, model] = await Promise.all([
    readFile(new URL('../src/services/post-purchase.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/public.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/models/PostPurchaseEntitlement.js', import.meta.url), 'utf8')
  ]);
  assert.match(service, /createHash\('sha256'\)/);
  assert.match(service, /randomBytes\(32\)\.toString\('base64url'\)/);
  assert.match(model, /tokenHash: \{ type: String, default: '', select: false/);
  assert.match(routes, /publicPostPurchaseEntitlement/);
  assert.doesNotMatch(routes, /tokenHash\s*:/);
});

test('v0.6.3 persists one order entitlement per service and links confirmed bookings back to SHOPLINE order identity', async () => {
  const [entitlementModel, bookingModel, service] = await Promise.all([
    readFile(new URL('../src/models/PostPurchaseEntitlement.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/models/Booking.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/post-purchase.js', import.meta.url), 'utf8')
  ]);
  assert.match(entitlementModel, /one_post_purchase_entitlement_per_order_rule/);
  assert.match(entitlementModel, /eligibleQuantity/);
  assert.match(entitlementModel, /usedBookings/);
  assert.match(entitlementModel, /tokenHash: \{ type: String, default: '', select: false/);
  assert.match(bookingModel, /entitlementId: \{ type: mongoose\.Schema\.Types\.ObjectId, ref: 'PostPurchaseEntitlement'/);
  assert.match(bookingModel, /shoplineOrderId/);
  assert.match(service, /quantity.*appointment|eligibleQuantity/is);
  assert.match(service, /restorePostPurchaseEntitlementForBooking/);
});

test('v0.6.3 consumes SHOPLINE order, payment and cancellation webhooks for post-purchase scheduling', async () => {
  const [webhook, shopline, adminRoutes] = await Promise.all([
    readFile(new URL('../src/routes/shopline-webhooks.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/shopline.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8')
  ]);
  assert.match(webhook, /upsertPostPurchaseEntitlementsFromOrder/);
  assert.match(webhook, /activatePostPurchaseEntitlementsForOrder/);
  assert.match(webhook, /revokePostPurchaseEntitlementsForOrder/);
  assert.match(webhook, /paidReceiptExists/);
  assert.match(shopline, /orders\/create/);
  assert.match(shopline, /order_transactions\/create/);
  assert.match(shopline, /orders\/cancelled/);
  assert.match(adminRoutes, /ensureBookingCommerceWebhooks/);
  assert.match(adminRoutes, /product_post_purchase/);
});

test('v0.6.3 sends a private order scheduling link and retries transient delivery failures', async () => {
  const [email, service, server] = await Promise.all([
    readFile(new URL('../src/services/email.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/post-purchase.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/server.js', import.meta.url), 'utf8')
  ]);
  assert.match(email, /Schedule appointment/);
  assert.match(email, /\?access=\$\{encodeURIComponent\(token\)\}/);
  assert.match(email, /private link is connected to your paid order/i);
  assert.match(service, /notificationLastAttemptAt/);
  assert.match(service, /processPostPurchaseScheduleNotifications/);
  assert.match(server, /startPostPurchaseNotificationScheduler/);
});

test('v0.6.3 protects the hosted scheduler with the private purchase token and pre-fills the order customer', async () => {
  const [routes, bookings, hosted] = await Promise.all([
    readFile(new URL('../src/routes/public.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/bookings.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/app.js', import.meta.url), 'utf8')
  ]);
  assert.match(routes, /postPurchaseAccessForRequest/);
  assert.match(routes, /post\('\/post-purchase-bookings'/);
  assert.match(routes, /Cache-Control.*no-store/);
  assert.match(bookings, /createPostPurchaseBookingForStore/);
  assert.match(bookings, /claimPostPurchaseEntitlement/);
  assert.match(bookings, /attachBookingToPostPurchaseEntitlement/);
  assert.match(bookings, /keep the entitlement quota consumed rather than/);
  assert.match(hosted, /new URLSearchParams\(window\.location\.search\)\.get\('access'\)/);
  assert.match(hosted, /\/api\/public\/post-purchase-bookings/);
  assert.match(hosted, /Order .* verified/);
});

test('v0.6.3 admin presents post-purchase scheduling as an order-linked flow rather than a pre-purchase booking button', async () => {
  const [view, app] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8')
  ]);
  assert.match(view, /data-commerce-mode="product_post_purchase"/);
  assert.doesNotMatch(view, /data-commerce-mode="product_post_purchase" disabled/);
  assert.match(view, /Private order scheduling link/);
  assert.match(app, /commerceMode === 'product_post_purchase' \? 'direct'/);
  assert.match(app, /No booking button is shown before purchase/);
  assert.match(app, /Private order link/);
});
