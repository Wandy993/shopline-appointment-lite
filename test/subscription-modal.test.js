import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('subscription details are opened from the store card instead of a dedicated navigation page', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  assert.doesNotMatch(view, /navButton\('billing', 'Plan & billing'/);
  assert.doesNotMatch(view, /id="billingView"/);
  assert.match(view, /id="subscriptionLauncher"/);
  assert.match(view, /id="subscriptionTopbarLauncher"/);
  assert.match(view, /id="subscriptionDialog"/);
  assert.match(view, /id="subscriptionStoreHandle"/);
  assert.match(view, /id="subscriptionStoreTimezone"/);
  assert.match(view, /id="billingPlanName"/);
  assert.match(view, /id="billingRenewal"/);
  assert.match(view, /id="billingAutoRenew"/);
  assert.match(view, /id="syncSubscriptionBilling"/);
  assert.match(view, /id="renewSubscriptionBilling"/);
});

test('subscription modal actions preserve SHOPLINE refresh and checkout behavior', async () => {
  const app = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.doesNotThrow(() => new vm.Script(app, { filename: 'public/admin/app.js' }));
  assert.match(app, /function openSubscriptionDialog\(\)/);
  assert.match(app, /\$\('#subscriptionLauncher'\)\?\.addEventListener\('click', openSubscriptionDialog\)/);
  assert.match(app, /\$\('#subscriptionTopbarLauncher'\)\?\.addEventListener\('click', openSubscriptionDialog\)/);
  assert.match(app, /\$\('#syncSubscriptionBilling'\)\?\.addEventListener\('click', refreshSubscription\)/);
  assert.match(app, /\$\('#renewSubscriptionBilling'\)\?\.addEventListener\('click', openShoplineRenewal\)/);
  assert.match(app, /if \(name === 'billing'\) \{ openSubscriptionDialog\(\); return; \}/);
  assert.match(app, /const archiveAllowed = button\.dataset\.view === 'bookings'/);
  assert.doesNotMatch(app, /\$\('#sidebarProvider'\)\.textContent = t\(payload\.email\.configured/);
});

test('subscription modal remains responsive and the sidebar card is a clear interactive entry', async () => {
  const styles = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.sidebar-status:hover/);
  assert.match(styles, /\.sidebar-status\.is-warning/);
  assert.match(styles, /\.subscription-modal/);
  assert.match(styles, /\.subscription-store-summary/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:480px\)/);
  assert.match(styles, /@media\(max-width:820px\)\{\.sidebar-status\{display:none\}\}/);
});

test('subscription modal release refreshes hosted customer asset cache keys', async () => {
  const book = await readFile(new URL('../src/views/book.js', import.meta.url), 'utf8');
  const manage = await readFile(new URL('../src/views/manage.js', import.meta.url), 'utf8');
  assert.match(book, /\/book\/assets\/styles\.css\?v=0\.8\.32/);
  assert.match(book, /\/book\/assets\/app\.js\?v=0\.8\.32/);
  assert.match(manage, /\/manage\/assets\/styles\.css\?v=0\.8\.32/);
  assert.match(manage, /\/manage\/assets\/app\.js\?v=0\.8\.32/);
});
