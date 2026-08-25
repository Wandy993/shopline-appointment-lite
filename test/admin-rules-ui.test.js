import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('product catalog binds clicks to rendered product option buttons', async () => {
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.match(asset, /\$\$\('#productOptions \.product-option'\)\.forEach\(button => button\.addEventListener\('click'/);
  assert.doesNotMatch(asset, /\$\$\('\.select-option'\)\.forEach\(button => button\.addEventListener\('click', \(\) => selectProduct/);
});

test('service cards constrain long titles and expose service operations', async () => {
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(asset, /条预约规则/);
  assert.match(asset, /rule\.duration/);
  assert.match(asset, /Booking link copied/);
  assert.match(view, /Home \/ onsite service/);
  assert.match(view, /Class \/ course/);
  assert.match(view, /id="capacity"/);
  assert.match(view, /id="minimumNoticeMinutes"/);
  assert.match(view, /id="availabilityExceptions"/);
  assert.match(stylesheet, /\.service-card\.service-list-row\{[^}]*min-width:0[^}]*overflow:hidden/);
  assert.match(stylesheet, /-webkit-line-clamp:2/);
  assert.match(stylesheet, /\.service-type-grid/);
});
