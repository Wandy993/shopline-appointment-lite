import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('App Block is zero-configuration and uses SHOPLINE resource IDs', async () => {
  const block = await readFile(new URL('../theme-extension-source/blocks/appointment-lite.html', import.meta.url), 'utf8');
  assert.match(block, /data-shop-id="\{\{ shop\.id \}\}"/);
  assert.match(block, /data-product-id="\{\{ product\.id \}\}"/);
  const schemaMatch = block.match(/\{\{#schema\}\}\s*([\s\S]*?)\s*\{\{\/schema\}\}/);
  assert.ok(schemaMatch, 'Theme App Block schema should be parseable');
  const schema = JSON.parse(schemaMatch[1]);
  // Additive presentation assets are allowed; validate required membership, not an exact one-file stylesheet array.
  assert.deepEqual(schema.javascript, ['public/appointment-lite.js']);
  assert.ok(schema.stylesheet.includes('public/appointment-lite.css'), 'customer UI stylesheet should remain registered');
  assert.deepEqual(schema.settings, []);
  assert.doesNotMatch(block, /block\.settings/);
});

test('theme asset exposes diagnostics and handles editor re-renders', async () => {
  const asset = await readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8');
  assert.match(asset, /\[Appointment Lite\]/);
  assert.match(asset, /shopline:section:load/);
  assert.match(asset, /MutationObserver/);
  assert.doesNotMatch(asset, /data\.customer|customer\.email/);
  assert.match(asset, /service time zone/i);
  assert.match(asset, /payload\.storeDate/);
});

test('booking dialog keeps selected times and submit action visible', async () => {
  const asset = await readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../theme-extension-source/public/appointment-lite.css', import.meta.url), 'utf8');
  assert.match(asset, /dialog\.style\.setProperty\('--al-accent', settings\.modal\.accentColor\)/);
  assert.match(asset, /class="al-actions"/);
  assert.match(stylesheet, /var\(--al-accent,#2f6fed\)/);
  assert.match(stylesheet, /\.al-time\[aria-pressed=true\][^{]*\{[^}]*color:var\(--al-primary-text,#fff\)/);
  assert.match(stylesheet, /\.al-form-body\{[^}]*min-height:0[^}]*overflow-y:auto[^}]*overflow-x:hidden/);
  assert.match(stylesheet, /\.al-actions\{[^}]*flex:0 0 auto/);
  assert.match(stylesheet, /\.al-dialog\{[^}]*100vw[^}]*100dvh/);
  assert.match(stylesheet, /\.al-form-body\{[^}]*overflow-y:auto[^}]*overflow-x:hidden/);
  assert.match(stylesheet, /font-size:16px/);
  assert.match(stylesheet, /input\[type=\"date\"\][^{]*\{[^}]*inline-size:100%!important[^}]*max-inline-size:100%!important/);
  assert.match(asset, /lockPageForDialog/);
  assert.match(asset, /document\.body\.classList\.add\('al-dialog-open'\)/);
});

test('confirmed booking is remembered without storing customer PII', async () => {
  const asset = await readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../theme-extension-source/public/appointment-lite.css', import.meta.url), 'utf8');
  assert.match(asset, /`al-booking:\$\{context\.shopId\}:\$\{context\.productId\}`/);
  assert.match(asset, /Appointment booked/);
  assert.match(asset, /Manage appointment/);
  assert.match(asset, /Change date or time/);
  assert.match(asset, /Cancel appointment/);
  assert.match(asset, /← Back/);
  assert.match(asset, /only online change/i);
  assert.match(asset, /RESCHEDULE_LIMIT/);
  assert.match(asset, /saveBookingReceipt\(context, payload\.booking\)/);
  assert.match(asset, /\{ shopId: context\.shopId, productId: context\.productId \}/);
  assert.doesNotMatch(asset, /receipt\.(?:name|email|phone)|booking\.customer(?:\W|$)/);
  assert.match(stylesheet, /\.al-booked\{/);
});
