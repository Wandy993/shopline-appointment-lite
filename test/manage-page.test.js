import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('cross-device manage page accepts email-query and legacy-fragment tokens then cleans the URL', async () => {
  const view = await readFile(new URL('../src/views/manage.js', import.meta.url), 'utf8');
  const asset = await readFile(new URL('../public/manage/app.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../public/manage/styles.css', import.meta.url), 'utf8');
  assert.match(view, /id="backButton"/);
  assert.match(view, /class="summary-icon"/);
  assert.match(view, /class="summary-copy"/);
  assert.match(view, /class="summary-art"/);
  assert.match(styles, /--brand:#3A7051/);
  assert.match(styles, /\.summary-copy strong\{[^}]*font-weight:600/);
  assert.match(styles, /@media\(max-width:640px\)/);
  assert.match(view, /only online change/i);
  assert.match(asset, /location\.hash/);
  assert.match(asset, /query\.get\('access'\)/);
  assert.match(asset, /sessionStorage\.setItem/);
  assert.match(asset, /history\.replaceState/);
  assert.match(asset, /managementToken/);
  assert.match(asset, /\/availability/);
  assert.match(asset, /\/reschedule/);
  assert.match(asset, /\/cancel/);
  assert.match(asset, /booking\.storeDate/);
  assert.match(asset, /Store time zone/);
  assert.doesNotMatch(asset, /localStorage/);
});
