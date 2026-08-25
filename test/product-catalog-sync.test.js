import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { nextPageInfoFromLink } from '../src/lib/shopline-pagination.js';
import { mergeCatalogProducts, normalizeProductId } from '../src/lib/product-catalog.js';

test('SHOPLINE pagination helper extracts the next page_info cursor', () => {
  const link = '<https://example.myshopline.com/admin/openapi/v20260301/products/products.json?limit=50&page_info=next-token>; rel="next", <https://example.myshopline.com/admin/openapi/v20260301/products/products.json?limit=50&page_info=prev-token>; rel="previous"';
  assert.equal(nextPageInfoFromLink(link), 'next-token');
  assert.equal(nextPageInfoFromLink(''), '');
});

test('product picker exposes explicit SHOPLINE sync with a no-store refresh', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(view, /id="productSyncButton"/);
  assert.match(view, /Sync SHOPLINE products/);
  assert.match(app, /ensureProducts\(true\)/);
  assert.match(app, /\/products\?refresh=\$\{Date\.now\(\)\}/);
  assert.match(app, /cache: 'no-store'/);
  assert.match(css, /\.product-sync-button/);
});

test('catalog merge reconciles REST and Admin GraphQL products by SHOPLINE product id', () => {
  const products = mergeCatalogProducts(
    [
      { id: '100', title: 'Existing product', handle: 'existing', status: 'active', created_at: '2026-08-20T00:00:00Z' },
      { id: '200', title: 'Archived product', status: 'archived' }
    ],
    [
      { id: 'gid://shopline/Product/100', title: 'Existing product', handle: 'existing', status: 'ACTIVE' },
      { id: 'gid://shopline/Product/300', title: 'Free Business Consultation', handle: 'free-business-consultation', status: 'ACTIVE', createdAt: '2026-08-25T00:00:00Z' }
    ]
  );
  assert.equal(normalizeProductId('gid://shopline/Product/300'), '300');
  assert.deepEqual(products.map(product => product.id), ['300', '100']);
  assert.equal(products.find(product => product.id === '300')?.title, 'Free Business Consultation');
  assert.ok(!products.some(product => product.id === '200'));
});

test('product catalog sync uses REST plus Admin GraphQL so service products are not limited to one source', async () => {
  const route = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  const catalog = await readFile(new URL('../src/services/product-catalog.js', import.meta.url), 'utf8');
  const shopline = await readFile(new URL('../src/services/shopline.js', import.meta.url), 'utf8');
  assert.match(route, /syncProductCatalog\(req\.shop\._id\)/);
  assert.match(catalog, /fetchRestProducts/);
  assert.match(catalog, /fetchGraphqlProducts/);
  assert.match(catalog, /products\(first: \$first, after: \$after, reverse: true\)/);
  assert.match(catalog, /nodes \{ id title handle status createdAt onlineStoreUrl productType \}/);
  assert.match(shopline, /\/admin\/graph\/\$\{config\.shopline\.apiVersion\}\/graphql\.json/);
});

test('service deletion keeps historical bookings but blocks deletion while confirmed bookings remain', async () => {
  const route = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.match(route, /confirmedBookingCount > 0/);
  assert.match(route, /RULE_HAS_ACTIVE_BOOKINGS/);
  assert.match(route, /preservedBookingCount: bookingCount/);
  assert.doesNotMatch(route, /RULE_HAS_BOOKINGS/);
  assert.match(app, /Historical bookings will stay in Booking records for reporting and audit/);
  assert.match(app, /confirmedBookingCount/);
});
