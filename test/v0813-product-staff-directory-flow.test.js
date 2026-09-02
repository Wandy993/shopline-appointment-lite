import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.1.3 product App Block can open public staff profiles before booking', async () => {
  const asset = await read('../theme-extension-source/public/appointment-lite.js');
  assert.match(asset, /productStaffDirectory\(rule, context\)/);
  assert.match(asset, /\/api\/public\/staff-directory/);
  assert.match(asset, /openStaffDirectory\(widget, rule, context, staff\)/);
  assert.match(asset, /Book with \$\{text\(item\.name\)\}/);
  assert.match(asset, /open\(widget, rule, context, \{ staffId \}\)/);
  assert.match(asset, /const initialStaffId = initialStaff/);
});

test('v0.8.1.3 Staff Directory block works on regular and product templates', async () => {
  const [block, asset] = await Promise.all([
    read('../theme-extension-source/blocks/appointment-lite-staff-directory.html'),
    read('../theme-extension-source/public/appointment-lite-page.js')
  ]);
  assert.match(block, /"templates": \["page", "product"\]/);
  assert.match(block, /data-shop-id="\{\{ shop\.id \}\}"/);
  assert.match(block, /data-product-id="\{\{ product\.id \}\}"/);
  assert.match(asset, /shopId=.*dataset\.shopId/);
  assert.match(asset, /productId=.*dataset\.productId/);
  assert.match(asset, /shopId=\$\{encodeURIComponent\(shopId\)\}&productId=\$\{encodeURIComponent\(productId\)\}/);
});

test('v0.8.1.3 adds dedicated staff-directory modal styling', async () => {
  const css = await read('../theme-extension-source/public/appointment-lite.css');
  assert.match(css, /\.al-staff-directory-dialog/);
  assert.match(css, /\.al-directory-grid/);
  assert.match(css, /\.al-directory-book/);
});
