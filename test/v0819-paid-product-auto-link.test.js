import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

async function checkoutPlacementResolver() {
  const admin = await read('../public/admin/app.js');
  const definition = admin.match(/function resolveCheckoutProductPlacement\(\{[\s\S]*?\n\}/);
  assert.ok(definition, 'Checkout product placement resolver should exist');
  return runInNewContext('(' + definition[0] + ')');
}

const input = overrides => ({
  bookingType: 'standalone', paymentMode: 'checkout', checkoutProductId: 'checkout-a',
  enabled: true, auto: true, scope: 'all', productIds: [], ...overrides
});

test('paid appointments use the checkout product automatically for product App Block placement', async () => {
  const resolve = await checkoutPlacementResolver();
  const result = resolve(input());
  assert.equal(result.hasCheckout, true);
  assert.equal(result.usingAuto, true);
  assert.equal(result.scope, 'selected');
  assert.deepEqual([...result.productIds], ['checkout-a']);
  const changedCheckout = resolve(input({ checkoutProductId: 'checkout-b', scope: 'selected', productIds: ['checkout-a'] }));
  assert.deepEqual([...changedCheckout.productIds], ['checkout-b']);
});

test('explicit custom display pages are not replaced by checkout product', async () => {
  const resolve = await checkoutPlacementResolver();
  const selected = resolve(input({ auto: false, scope: 'selected', productIds: ['display-b', 'display-c'] }));
  assert.equal(selected.usingAuto, false);
  assert.equal(selected.scope, 'selected');
  assert.deepEqual([...selected.productIds], ['display-b', 'display-c']);
  const all = resolve(input({ auto: false, scope: 'all', productIds: [] }));
  assert.equal(all.scope, 'all');
  assert.deepEqual([...all.productIds], []);
});

test('free, post-purchase, direct-only, and missing-checkout appointments do not auto-bind', async () => {
  const resolve = await checkoutPlacementResolver();
  for (const overrides of [
    { paymentMode: 'none' },
    { bookingType: 'purchase_triggered' },
    { checkoutProductId: '' },
    { enabled: false }
  ]) {
    const result = resolve(input({ scope: 'all', productIds: ['other'], ...overrides }));
    assert.equal(result.usingAuto, false);
    assert.equal(result.scope, 'all');
    assert.deepEqual([...result.productIds], ['other']);
  }
});

test('paid App Block binding uses one product choice by default with an explicit advanced override', async () => {
  const [view, admin, css] = await Promise.all([
    read('../src/views/admin.js'),
    read('../public/admin/app.js'),
    read('../public/admin/styles.css')
  ]);
  for (const id of ['productPlacementConfig', 'checkoutPlacementSync', 'checkoutPlacementTitle', 'checkoutPlacementDescription', 'productPlacementAdvanced', 'checkoutPlacementCustomize', 'checkoutPlacementRestore', 'placementProductPickerButton']) {
    assert.match(view, new RegExp('id="' + id + '"'), id + ' must remain in the configuration form');
  }
  assert.match(view, /Choose the SHOPLINE checkout product once/);
  assert.match(view, /Same product for display and checkout/);
  assert.match(admin, /state\.checkoutPlacementAuto = !rule \|\| !oldProductBlock\?\.enabled/);
  assert.match(admin, /savedDisplayIds\.length === 1 && savedDisplayIds\[0\] === savedCheckoutId/);
  assert.match(admin, /setProductPlacementScope\(button\.dataset\.productPlacementScope, \{ explicit: true \}\)/);
  assert.match(admin, /checkoutPlacementRestore/);
  assert.match(admin, /checkoutPlacementCustomize/);
  assert.match(css, /\.app-shell \.checkout-placement-sync\{/);
  assert.match(css, /\.app-shell #productPlacementAdvanced\.hidden\{display:none\}/);
});
