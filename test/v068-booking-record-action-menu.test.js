import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

test('v0.6.8 reduces booking records to five stable columns', async () => {
  const [view, css] = await Promise.all([source('src/views/admin.js'), source('public/admin/styles.css')]);
  assert.match(view, />Customer & service<\/span><span>Booking details<\/span><span>Payment<\/span><span>Appointment<\/span><span>Actions<\/span>/);
  assert.match(css, /v0\.6\.8 — Booking record hierarchy \+ compact action menu/);
  assert.match(css, /grid-template-columns:minmax\(280px,1\.55fr\) minmax\(260px,1\.24fr\) minmax\(100px,\.52fr\) minmax\(118px,\.62fr\) minmax\(176px,\.78fr\)/);
});

test('v0.6.8 combines date time staff and location into one booking details cell', async () => {
  const admin = await source('public/admin/app.js');
  assert.match(admin, /class="booking-schedule-cell"/);
  assert.match(admin, /const scheduleMeta = \[staffLabel, locationLabel\]\.filter\(Boolean\)\.join\(' · '\)/);
  assert.doesNotMatch(admin, /class="booking-cell"><strong>\$\{escapeHtml\(when\.primary\)\}<\/strong><span>\$\{escapeHtml\(when\.secondary\)\}<\/span><\/div><div class="booking-cell"/);
});

test('v0.6.8 keeps appointment activity visible and hides secondary operations in a custom action menu', async () => {
  const admin = await source('public/admin/app.js');
  assert.match(admin, /class="small booking-action activity" data-flow-booking/);
  assert.match(admin, /data-booking-actions-toggle/);
  assert.match(admin, /class="booking-action-menu hidden" role="menu"/);
  assert.match(admin, /data-edit-booking/);
  assert.match(admin, /data-complete/);
  assert.match(admin, /data-no-show/);
  assert.match(admin, /data-cancel/);
  assert.match(admin, /data-delete-booking/);
});

test('v0.6.8 uses a positioned custom menu instead of a native select', async () => {
  const [admin, css] = await Promise.all([source('public/admin/app.js'), source('public/admin/styles.css')]);
  assert.match(admin, /function positionBookingActionMenu\(group\)/);
  assert.match(admin, /function toggleBookingActionMenu\(button\)/);
  assert.match(css, /\.booking-action-menu\{width:210px;position:fixed;z-index:180/);
  assert.doesNotMatch(admin, /<select[^>]*booking-action/);
});

test('v0.6.8 gives every row a consistent activity entry including order lifecycle records', async () => {
  const admin = await source('public/admin/app.js');
  assert.match(admin, /: `<button type="button" class="small booking-action activity" data-flow-booking="\$\{booking\._id\}">/);
  assert.match(admin, /const actions = state\.archiveMode/);
  assert.doesNotMatch(admin, /const actions = isLifecycle/);
});

test('v0.6.8 release version is aligned', async () => {
  const [pkgText, adminView, bookView, theme, health] = await Promise.all([
    source('package.json'), source('src/views/admin.js'), source('src/views/book.js'), source('theme-extension-source/public/appointment-lite.js'), source('src/app.js')
  ]);
  assert.equal(JSON.parse(pkgText).version, '0.8.0');
  assert.match(adminView, /styles\.css\?v=0.8.0/);
  assert.match(adminView, /app\.js\?v=0.8.0/);
  assert.match(bookView, /styles\.css\?v=0.8.0/);
  assert.match(theme, /const VERSION = '0.8.0'/);
  assert.match(health, /version: '0.8.0'/);
});
