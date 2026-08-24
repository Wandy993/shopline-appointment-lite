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
});
