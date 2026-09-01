import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRuleInput } from '../src/lib/validation.js';

const weekly = [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }];
const base = overrides => ({ serviceTitle: 'Aesthetic consultation', serviceType: 'consultation', duration: 60, buffer: 0, capacity: 1, bookingWindowDays: 90, minimumNoticeMinutes: 0, weeklyAvailability: weekly, ...overrides });

test('v0.8.1 standalone booking has no business product and can be placed on selected product pages', () => {
  const result = validateRuleInput(base({
    bookingType: 'standalone', paymentMode: 'none',
    storefrontPlacement: { directLink: true, pageBlock: true, productBlock: { enabled: true, scope: 'selected', productIds: ['p1', 'p2'] }, appEmbed: { enabled: true } }
  }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.productId, '');
  assert.equal(result.value.bookingType, 'standalone');
  assert.equal(result.value.commerceMode, 'standalone_free');
  assert.deepEqual(result.value.storefrontPlacement.productBlock.productIds, ['p1', 'p2']);
  assert.equal(result.value.storefrontPlacement.appEmbed.enabled, true);
});

test('v0.8.1 purchase-triggered booking uses trigger products and disables public placement', () => {
  const result = validateRuleInput(base({
    bookingType: 'purchase_triggered', paymentMode: 'none',
    purchaseTrigger: { products: [{ id: 'p1', title: 'Installation package', handle: 'install' }] },
    storefrontPlacement: { directLink: false, pageBlock: false, productBlock: { enabled: false }, appEmbed: { enabled: false } }
  }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.commerceMode, 'product_post_purchase');
  assert.equal(result.value.bookingSource, 'direct');
  assert.equal(result.value.productId, 'p1');
  assert.equal(result.value.purchaseTrigger.products[0].id, 'p1');
});

test('v0.8.1 standalone paid booking keeps checkout product separate from placement products', () => {
  const result = validateRuleInput(base({
    bookingType: 'standalone', paymentMode: 'checkout',
    checkoutProduct: { productId: 'pay-product', productTitle: 'Consultation payment', variantId: 'variant-1', variantTitle: 'Default', price: '29.00' },
    storefrontPlacement: { directLink: true, pageBlock: true, productBlock: { enabled: true, scope: 'selected', productIds: ['display-product'] }, appEmbed: { enabled: false } }
  }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.checkoutProduct.productId, 'pay-product');
  assert.deepEqual(result.value.storefrontPlacement.productBlock.productIds, ['display-product']);
  assert.equal(result.value.productId, 'pay-product');
});

test('v0.8.1 admin separates booking model from storefront placement', async () => {
  const [view, admin] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8')
  ]);
  assert.match(view, /How can customers book this service\?/);
  assert.match(view, /id="bookingTypeGrid"/);
  assert.match(view, /id="paymentModeGrid"/);
  assert.match(view, /data-rule-step="1"[\s\S]*id="storefrontPlacementFieldset"/);
  assert.doesNotMatch(view, /id="serviceTypeGrid"/);
  assert.match(view, /Service category <span>optional<\/span>/);
  assert.match(view, /App Embed floating launcher/);
  assert.match(admin, /purchaseTrigger: \{ products: triggerProducts \}/);
  assert.match(admin, /storefrontPlacement,/);
  assert.match(admin, /productPlacementScope/);
});

test('v0.8.1 App Embed is a SHOPLINE body embed and loads only embed-enabled services', async () => {
  const [block, asset, route] = await Promise.all([
    readFile(new URL('../theme-extension-source/blocks/appointment-lite-embed.html', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite-embed.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/public.js', import.meta.url), 'utf8')
  ]);
  assert.match(block, /"target": "body"/);
  assert.match(block, /data-shop-id="\{\{ shop\.id \}\}"/);
  assert.match(asset, /\/api\/public\/embed-services/);
  assert.match(asset, /Choose a service/);
  assert.match(route, /'storefrontPlacement\.appEmbed\.enabled': true/);
  assert.match(route, /bookingType: \{ \$ne: 'purchase_triggered' \}/);
});

test('v0.8.1 product App Block submits exact rule identity instead of treating display product as business product', async () => {
  const [theme, bookings] = await Promise.all([
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/bookings.js', import.meta.url), 'utf8')
  ]);
  assert.match(theme, /ruleId: rule\.id/);
  assert.match(bookings, /storefrontPlacement\.productBlock\.enabled/);
  assert.match(bookings, /placement\.productIds/);
});
