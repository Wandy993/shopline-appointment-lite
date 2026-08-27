import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

test('v0.6.5 requests read-only SHOPLINE location access without inventory or location write permissions', async () => {
  const [config, env, shopline] = await Promise.all([source('src/config.js'), source('.env.example'), source('src/services/shopline.js')]);
  assert.match(config, /read_location/);
  assert.match(env, /SHOPLINE_SCOPES=.*read_location/);
  assert.match(shopline, /SHOPLINE_LOCATION_SCOPE = 'read_location'/);
  assert.doesNotMatch(config, /write_location|read_inventory|write_inventory/);
  assert.doesNotMatch(env, /write_location|read_inventory|write_inventory/);
});

test('v0.6.5 reads SHOPLINE locations and keeps a canonical location snapshot on rules and bookings', async () => {
  const [service, rule, booking, route] = await Promise.all([
    source('src/services/locations.js'), source('src/models/AppointmentRule.js'), source('src/models/Booking.js'), source('src/routes/admin.js')
  ]);
  assert.match(service, /locations\/list\.json/);
  assert.match(service, /normalizeShoplineLocation/);
  assert.match(service, /formatLocationSnapshot/);
  for (const text of [rule, booking]) {
    assert.match(text, /locationMode/);
    assert.match(text, /shoplineLocationId/);
    assert.match(text, /locationSnapshot/);
  }
  assert.match(route, /adminRouter\.get\('\/locations'/);
  assert.match(route, /canonicalizeRuleLocation/);
  assert.match(route, /SHOPLINE_LOCATION_NOT_FOUND/);
});

test('v0.6.5 exposes service location modes and customer-address collection across hosted and Theme storefronts', async () => {
  const [view, admin, hostedView, hosted, theme, validation] = await Promise.all([
    source('src/views/admin.js'), source('public/admin/app.js'), source('src/views/book.js'), source('public/book/app.js'), source('theme-extension-source/public/appointment-lite.js'), source('src/lib/validation.js')
  ]);
  assert.match(view, /data-location-mode="shopline_location"/);
  assert.match(view, /data-location-mode="customer_address"/);
  assert.match(view, /data-location-mode="online"/);
  assert.match(view, /data-location-mode="custom"/);
  assert.match(admin, /loadLocations/);
  assert.match(admin, /Refresh locations/);
  assert.match(hostedView, /name="serviceAddress"/);
  assert.match(hosted, /postPurchase\?\.shippingAddress/);
  assert.match(theme, /name="serviceAddress"/);
  assert.match(validation, /serviceAddress/);
});

test('v0.6.5 records SHOPLINE order lifecycle before scheduling and keeps payment and appointment states separate', async () => {
  const [postPurchase, route, view, admin] = await Promise.all([
    source('src/services/post-purchase.js'), source('src/routes/admin.js'), source('src/views/admin.js'), source('public/admin/app.js')
  ]);
  assert.match(postPurchase, /status:\s*'pending_payment'/);
  assert.match(route, /PostPurchaseEntitlement\.find/);
  assert.match(route, /recordType:\s*'order_lifecycle'/);
  assert.match(route, /paymentStatus/);
  assert.match(route, /appointmentStatus/);
  assert.match(route, /awaiting_schedule/);
  assert.match(route, /partially_scheduled/);
  assert.match(view, />Booking details<\/span><span>Payment<\/span><span>Appointment<\/span>/);
  assert.match(admin, /paymentStatusLabel/);
  assert.match(admin, /appointmentStatusLabel/);
  assert.match(admin, /booking\.shoplineOrder\?\.adminUrl/);
});

test('v0.6.5 reconciliation backfills recent paid and unpaid post-purchase orders', async () => {
  const [paid, adminRoute, auth, adminView] = await Promise.all([
    source('src/services/paid-bookings.js'), source('src/routes/admin.js'), source('src/routes/auth.js'), source('src/views/admin.js')
  ]);
  assert.match(paid, /reconcileRecentCommerceOrdersForShop/);
  assert.match(paid, /status:\s*'any'/);
  assert.match(paid, /upsertPostPurchaseEntitlementsFromOrder[\s\S]*paid/);
  assert.match(adminRoute, /reconcileRecentCommerceOrdersForShop/);
  assert.match(auth, /reconcileRecentCommerceOrdersForShop/);
  assert.match(adminView, /Sync SHOPLINE orders/);
});

test('v0.6.5 stores order shipping address for purchase-first customer-address appointments', async () => {
  const [entitlement, postPurchase, bookings] = await Promise.all([
    source('src/models/PostPurchaseEntitlement.js'), source('src/services/post-purchase.js'), source('src/services/bookings.js')
  ]);
  assert.match(entitlement, /shippingAddress/);
  assert.match(postPurchase, /orderShippingAddress/);
  assert.match(postPurchase, /shippingAddress/);
  assert.match(bookings, /rule\.locationMode === 'customer_address'/);
  assert.match(bookings, /claimed\.shippingAddress/);
});

test('current release versions stay aligned without stale hard-coded asset versions', async () => {
  const packageJson = JSON.parse(await source('package.json'));
  const version = packageJson.version;
  assert.equal(version, '0.6.8');
  const [health, admin, book, theme] = await Promise.all([
    source('src/app.js'), source('src/views/admin.js'), source('src/views/book.js'), source('theme-extension-source/public/appointment-lite.js')
  ]);
  assert.ok(health.includes(`version: '${version}'`));
  assert.ok(admin.includes(`/admin/styles.css?v=${version}`));
  assert.ok(admin.includes(`/admin/app.js?v=${version}`));
  assert.ok(book.includes(`/book/assets/styles.css?v=${version}`));
  assert.ok(book.includes(`/book/assets/app.js?v=${version}`));
  assert.ok(theme.includes(`const VERSION = '${version}'`));
});
