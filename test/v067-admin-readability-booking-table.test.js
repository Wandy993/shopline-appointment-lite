import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

test('v0.6.7 increases merchant admin text contrast without flattening semantic status colors', async () => {
  const css = await source('public/admin/styles.css');
  assert.match(css, /v0\.6\.7 — Admin readability \+ booking table cleanup/);
  assert.match(css, /--text:\s*#111827/);
  assert.match(css, /--muted:\s*#344054/);
  assert.match(css, /--subtle:\s*#475467/);
  assert.match(css, /\.booking-primary strong\{color:#172033/);
  assert.match(css, /\.booking-primary span\{color:#344054/);
  assert.match(css, /\.booking-cell strong\{color:#182230/);
});

test('v0.6.7 removes the SHOPLINE order-number column and keeps order access in row actions', async () => {
  const [view, admin] = await Promise.all([source('src/views/admin.js'), source('public/admin/app.js')]);
  assert.match(view, />Customer & service<\/span>/);
  assert.match(view, />Payment<\/span>/);
  assert.match(view, />Appointment<\/span>/);
  assert.doesNotMatch(view, />SHOPLINE order<\/span>/);
  assert.doesNotMatch(admin, /booking-order-column/);
  assert.doesNotMatch(admin, /booking-order-cell/);
  assert.match(admin, /booking\.shoplineOrder\?\.adminUrl/);
  assert.match(admin, /Open order/);
});

test('v0.6.7 centers payment and appointment states and gives actions enough room', async () => {
  const css = await source('public/admin/styles.css');
  assert.match(css, /\.booking-status-cell\{[^}]*align-items:center[^}]*justify-content:center[^}]*text-align:center/);
  assert.match(css, /\.booking-table \.table-head>span:nth-child\(4\),\.booking-table \.table-head>span:nth-child\(5\)\{[^}]*justify-content:center/);
});

test('v0.6.7 release version is aligned', async () => {
  const [pkgText, appView, bookView, theme] = await Promise.all([
    source('package.json'), source('src/views/admin.js'), source('src/views/book.js'), source('theme-extension-source/public/appointment-lite.js')
  ]);
  const pkg = JSON.parse(pkgText);
  assert.equal(pkg.version, '0.6.9');
  assert.match(appView, /styles\.css\?v=0\.6\.9/);
  assert.match(appView, /app\.js\?v=0\.6\.9/);
  assert.match(bookView, /styles\.css\?v=0\.6\.9/);
  assert.match(theme, /const VERSION = '0\.6\.9'/);
});
