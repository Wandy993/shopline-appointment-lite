import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('cross-device manage page accepts email-query and legacy-fragment tokens then cleans the URL', async () => {
  const view = await readFile(new URL('../src/views/manage.js', import.meta.url), 'utf8');
  const asset = await readFile(new URL('../public/manage/app.js', import.meta.url), 'utf8');
  assert.match(view, /id="backButton"/);
  assert.match(view, /only online change/i);
  assert.match(asset, /location\.hash/);
  assert.match(asset, /query\.get\('access'\)/);
  assert.match(asset, /sessionStorage\.setItem/);
  assert.match(asset, /history\.replaceState/);
  assert.match(asset, /managementToken/);
  assert.match(asset, /\/availability/);
  assert.match(asset, /\/reschedule/);
  assert.match(asset, /\/cancel/);
  assert.doesNotMatch(asset, /localStorage/);
});
