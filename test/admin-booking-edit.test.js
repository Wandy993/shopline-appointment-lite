import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin booking list exposes an application-native edit dialog', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.match(view, /id="bookingDialog"/);
  assert.match(view, /id="bookingDate"/);
  assert.match(view, /id="bookingTime"/);
  assert.match(asset, /data-edit-booking/);
  assert.match(asset, /method: 'PUT'/);
  assert.match(asset, /notification\?\.skipped/);
  assert.match(view, /id="emailStatusText"/);
  assert.match(view, /id="sendTestEmail"/);
  assert.match(asset, /\/email\/test/);
  assert.match(asset, /customer email sent/);
});

test('admin uses designed controls and exposes a per-store Email Studio', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.match(view, /Email Studio/);
  assert.match(view, /id="productDialog"/);
  assert.match(view, /data-booking-view="calendar"/);
  assert.match(view, /id="bookingServiceFilter"/);
  assert.match(view, /id="bookingStatusFilter"/);
  assert.match(view, /id="exportBookings"/);
  assert.match(view, /id="confirmDialog"/);
  assert.match(view, /id="emailPreview"/);
  assert.match(view, /id="serviceTypeGrid"/);
  assert.match(view, /id="availabilityExceptions"/);
  assert.doesNotMatch(asset, /\bconfirm\s*\(|\balert\s*\(/);
  assert.match(asset, /\/email\/settings/);
  assert.match(view, /id="languageMenu"/);
  assert.match(view, /id="bookingFlowDialog"/);
  assert.match(view, /id="openThemeEditor"[^>]+target="_blank"/);
  assert.doesNotMatch(view, /Railway|Aliyun|HTTPS OpenAPI|About the Gmail/);
  assert.doesNotMatch(asset, /payload\.email\.provider/);
});
