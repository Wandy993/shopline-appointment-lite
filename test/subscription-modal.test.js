import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('store name links to the storefront and subscription uses a compact popover', async () => {
  const [view, routes] = await Promise.all([read('../src/views/admin.js'), read('../src/routes/admin.js')]);
  assert.match(view, /id="storefrontLink"/);
  assert.match(view, /id="subscriptionTopbarLauncher"/);
  assert.match(view, /id="subscriptionPopover"/);
  assert.doesNotMatch(view, /id="subscriptionDialog"/);
  assert.match(view, /id="subscriptionExpiryNotice"/);
  assert.match(view, /id="billingRenewal"/);
  assert.match(view, /id="billingAutoRenew"/);
  assert.equal((routes.match(/primaryDomain: req\.shop\.primaryDomain \|\| ''/g) || []).length, 3);
});

test('subscription renewal appears only for inactive access or within three days of expiry', async () => {
  const app = await read('../public/admin/app.js');
  assert.doesNotThrow(() => new vm.Script(app, { filename: 'public/admin/app.js' }));
  assert.match(app, /function storefrontUrlForShop\(/);
  assert.match(app, /function subscriptionDaysUntilExpiry\(/);
  assert.match(app, /daysUntilExpiry !== null && daysUntilExpiry <= 3/);
  assert.match(app, /subscription\?\.enabled && !pending && \(accessDenied \|\| nearExpiry\)/);
  assert.match(app, /function openSubscriptionPopover\(/);
  assert.match(app, /function closeSubscriptionPopover\(/);
  assert.match(app, /toggleSubscriptionPopover\(event\.currentTarget\)/);
  assert.doesNotMatch(app, /openSubscriptionDialog/);
  assert.doesNotMatch(app, /\$\('#subscriptionDialog'\)/);
});

test('popover closes on outside click and Escape and remains responsive', async () => {
  const [app, styles] = await Promise.all([read('../public/admin/app.js'), read('../public/admin/styles.css')]);
  assert.match(app, /event\.key === 'Escape'/);
  assert.match(app, /event\.target\.closest\?\.\('#subscriptionPopover/);
  assert.match(styles, /\.subscription-popover\{[\s\S]*?position:fixed/);
  assert.match(styles, /right:18px/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.doesNotMatch(styles, /\.subscription-modal/);
});

test('release asset cache keys stay aligned for hosted pages and Theme Extension', async () => {
  const [admin, book, manage, theme] = await Promise.all([
    read('../src/views/admin.js'),
    read('../src/views/book.js'),
    read('../src/views/manage.js'),
    read('../theme-extension-source/public/appointment-lite.js')
  ]);
  assert.match(admin, /\/admin\/styles\.css\?v=0\.8\.33&build=0\.8\.33/);
  assert.match(admin, /\/admin\/app\.js\?v=0\.8\.33&build=0\.8\.33/);
  assert.match(book, /\/book\/assets\/styles\.css\?v=0\.8\.33/);
  assert.match(book, /\/book\/assets\/app\.js\?v=0\.8\.33/);
  assert.match(manage, /\/manage\/assets\/styles\.css\?v=0\.8\.33/);
  assert.match(manage, /\/manage\/assets\/app\.js\?v=0\.8\.33/);
  assert.match(theme, /const VERSION = '0\.8\.33'/);
});
