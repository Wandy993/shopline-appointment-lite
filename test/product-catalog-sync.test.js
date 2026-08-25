import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { nextPageInfoFromLink } from '../src/lib/shopline-pagination.js';

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

test('product catalog sync requests newest products, includes drafts, and hides archived items', async () => {
  const route = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  assert.match(route, /order_by: 'created_at_desc'/);
  assert.doesNotMatch(route, /status: 'active'/);
  assert.match(route, /product\.status \|\| ''\)\.toLowerCase\(\) !== 'archived'/);
  assert.match(route, /nextPageInfoFromLink\(link\)/);
  assert.match(route, /Cache-Control', 'no-store'/);
});
