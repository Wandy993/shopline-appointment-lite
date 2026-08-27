import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = async relative => readFile(path.join(root, relative), 'utf8');

test('v0.6.4 requests read-only SHOPLINE order access and never requests order write access', async () => {
  const [config, env] = await Promise.all([source('src/config.js'), source('.env.example')]);
  assert.match(config, /read_orders/);
  assert.match(env, /SHOPLINE_SCOPES=.*read_orders/);
  assert.doesNotMatch(config, /write_orders/);
  assert.doesNotMatch(env, /write_orders/);
});

test('v0.6.4 uses orders paid webhook and recent-order reconciliation for payment recovery', async () => {
  const [shopline, webhook, paid, auth] = await Promise.all([
    source('src/services/shopline.js'), source('src/routes/shopline-webhooks.js'), source('src/services/paid-bookings.js'), source('src/routes/auth.js')
  ]);
  assert.match(shopline, /'orders\/paid'/);
  assert.match(webhook, /SUPPORTED_TOPICS.*orders\/paid/s);
  assert.match(webhook, /handleOrderPaid/);
  assert.match(paid, /reconcileRecentPaidOrdersForShop/);
  assert.match(paid, /financial_status:\s*'paid'/);
  assert.match(auth, /reconcileRecentPaidOrdersForShop/);
});

test('v0.6.4 batches staff availability reads instead of querying once per slot', async () => {
  const [staffing, publicRoute] = await Promise.all([source('src/services/staffing.js'), source('src/routes/public.js')]);
  assert.match(staffing, /function availableStaffFromContext/);
  assert.match(staffing, /const context = await availabilityContext\(\{ shopId, rule, occurrences: candidateOccurrences/);
  assert.match(staffing, /for \(const time of baseSlots\)[\s\S]*availableStaffFromContext/);
  assert.doesNotMatch(staffing, /for \(const time of baseSlots\)[\s\S]{0,500}await availableStaffForOccurrences/);
  assert.match(publicRoute, /const \[reservations, bookingRows\] = await Promise\.all/);
});

test('v0.6.4 exposes order authorization, reconciliation and direct SHOPLINE order links in admin', async () => {
  const [route, view, app] = await Promise.all([source('src/routes/admin.js'), source('src/views/admin.js'), source('public/admin/app.js')]);
  assert.match(route, /ORDER_ACCESS_REQUIRED/);
  assert.match(route, /\/commerce\/reconcile/);
  assert.match(route, /\/admin\/orders\/\$\{encodeURIComponent\(orderId\)\}/);
  assert.match(view, /orderAccessBanner/);
  assert.match(view, /Sync paid orders/);
  assert.match(app, /booking-order-link/);
  assert.match(app, /shoplineOrder\.adminUrl/);
});

test('v0.6.4 fixes service staff portrait rendering and adds post-purchase email choice', async () => {
  const [app, css, settings, shop, email] = await Promise.all([
    source('public/admin/app.js'), source('public/admin/styles.css'), source('src/lib/email-settings.js'), source('src/models/Shop.js'), source('src/services/email.js')
  ]);
  assert.match(app, /staffAvatarMarkup\(item, 'rule-assignment-avatar'\)/);
  assert.match(css, /rule-assignment-avatar/);
  assert.match(settings, /postPurchaseScheduleLink:\s*true/);
  assert.match(shop, /postPurchaseScheduleLink:\s*\{ type: Boolean, default: true \}/);
  assert.match(email, /POST_PURCHASE_NOTIFICATION_DISABLED/);
  assert.match(app, /customerNotifyPostPurchase/);
});

test('v0.6.4 release versions stay aligned across admin, hosted booking and Theme App Block', async () => {
  const packageJson = JSON.parse(await source('package.json'));
  const [health, admin, book, theme] = await Promise.all([source('src/app.js'), source('src/views/admin.js'), source('src/views/book.js'), source('theme-extension-source/public/appointment-lite.js')]);
  assert.equal(packageJson.version, '0.6.4');
  assert.match(health, /version: '0\.6\.4'/);
  assert.match(admin, /styles\.css\?v=0\.6\.4/);
  assert.match(admin, /app\.js\?v=0\.6\.4/);
  assert.match(book, /styles\.css\?v=0\.6\.4/);
  assert.match(book, /app\.js\?v=0\.6\.4/);
  assert.match(theme, /const VERSION = '0\.6\.4'/);
});
