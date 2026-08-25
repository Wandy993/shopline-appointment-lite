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


test('service editor keeps navigation visible and explains slot timing', async () => {
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(view, /id="slotLogicNotice"/);
  assert.match(view, /id="slotLogicText"/);
  assert.match(asset, /function renderSlotLogic\(/);
  assert.match(asset, /duration \+ buffer/);
  assert.match(stylesheet, /\.rule-modal form\{[^}]*grid-template-rows:auto auto minmax\(0,1fr\) auto/);
  assert.match(stylesheet, /\.rule-modal \.modal-body\{[^}]*overflow-y:auto/);
  assert.match(stylesheet, /\.rule-modal \.modal-actions\{[^}]*z-index:4/);
});

test('booking-mode unit suffixes stay horizontal and timing guidance keeps clear spacing', async () => {
  const stylesheet = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  const view = await readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8');
  const marker = '/* v0.4.0 UI Polish.1 — horizontal input units + booking-mode spacing */';
  const patch = stylesheet.slice(stylesheet.indexOf(marker));
  assert.ok(patch.startsWith(marker));
  assert.match(patch, /\.input-suffix>input\{[^}]*width:0;[^}]*min-width:0;[^}]*flex:1 1 auto/);
  assert.match(patch, /\.input-suffix>span\{[^}]*flex:0 0 auto;[^}]*white-space:nowrap;[^}]*writing-mode:horizontal-tb/);
  assert.match(patch, /\.mode-settings\{[^}]*display:grid;[^}]*gap:16px;[^}]*padding-bottom:2px/);
  assert.match(patch, /\.timing-helper\{[^}]*margin-top:0;[^}]*position:relative/);
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const escapedVersion = pkg.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(view, new RegExp(`styles\\.css\\?v=${escapedVersion}`));
  assert.match(view, new RegExp(`app\\.js\\?v=${escapedVersion}`));
});
