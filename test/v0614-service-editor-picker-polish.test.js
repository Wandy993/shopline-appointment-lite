import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v0.6.16 service wizard replaces native select presentation with Appointment Lite pickers', async () => {
  const [view, app, css] = await Promise.all([
    source('src/views/admin.js'),
    source('public/admin/app.js'),
    source('public/admin/styles.css')
  ]);

  for (const id of ['paidVariantSelect', 'paymentHoldMinutes', 'minimumNoticeMinutes']) {
    assert.match(view, new RegExp(`id="${id}"`));
  }
  assert.match(app, /function initRuleSelects\(/);
  assert.match(app, /\$\$\('#ruleDialog select'\)/);
  assert.match(app, /function enhanceRuleSelect\(/);
  assert.match(app, /rule-select-native/);
  assert.match(css, /v0.6.16 — Service editor picker polish/);
  assert.match(css, /\.rule-select-native\{display:none!important\}/);
  assert.match(css, /\.rule-select-menu\{position:absolute;z-index:120/);
});

test('v0.6.16 dynamic availability exception selects inherit the custom picker layer', async () => {
  const app = await source('public/admin/app.js');
  assert.match(app, /<select class="exception-mode"/);
  assert.match(app, /MutationObserver\(records =>/);
  assert.match(app, /node\.querySelectorAll\?\.\('select'\)/);
  assert.match(app, /ruleSelectObserver\.observe\(\$\('#ruleDialog'\)/);
});

test('v0.6.16 picker menus flip inside the visible wizard and close during scrolling', async () => {
  const [app, css] = await Promise.all([source('public/admin/app.js'), source('public/admin/styles.css')]);
  assert.match(app, /function menuPlacement\(/);
  assert.match(app, /const below = Math\.max\(0, bodyRect\.bottom - triggerRect\.bottom - 10\)/);
  assert.match(app, /const up = below < Math\.min\(measured, 150\) && above > below/);
  assert.match(app, /#ruleDialog \.modal-body'\)\?\.addEventListener\('scroll'/);
  assert.match(css, /\.rule-select-ui\.drop-up \.rule-select-menu/);
  assert.match(css, /max-height:var\(--rule-select-max-height,260px\)/);
});

test('v0.6.16 service time zone uses a searchable Appointment Lite picker instead of browser datalist UI', async () => {
  const [view, app, css] = await Promise.all([
    source('src/views/admin.js'),
    source('public/admin/app.js'),
    source('public/admin/styles.css')
  ]);
  assert.doesNotMatch(view, /serviceTimezoneOptions/);
  assert.doesNotMatch(view, /list="serviceTimezoneOptions"/);
  assert.match(view, /id="serviceTimezonePicker" class="timezone-picker"/);
  assert.match(view, /id="serviceTimezoneMenu" class="timezone-picker-menu hidden"/);
  assert.match(app, /function renderServiceTimezoneMenu\(/);
  assert.match(app, /function openServiceTimezonePicker\(/);
  assert.match(app, /slice\(0, 80\)/);
  assert.match(css, /\.timezone-picker-menu\{position:absolute;z-index:120/);
});

test('v0.6.16 SHOPLINE location picker gains the same viewport-aware drop-up safety', async () => {
  const [app, css] = await Promise.all([source('public/admin/app.js'), source('public/admin/styles.css')]);
  assert.match(app, /function positionLocationPickerMenu\(/);
  assert.match(app, /requestAnimationFrame\(positionLocationPickerMenu\)/);
  assert.match(css, /\.location-picker\.drop-up \.location-picker-menu/);
  assert.match(css, /--location-menu-max-height/);
});

test('v0.6.16 paid checkout guidance has deliberate spacing before checkout controls', async () => {
  const [view, css] = await Promise.all([source('src/views/admin.js'), source('public/admin/styles.css')]);
  assert.match(view, /class="paid-checkout-fields hidden"/);
  assert.match(view, /class="paid-checkout-callout"/);
  assert.match(css, /\.paid-checkout-fields\{margin-top:20px;padding:16px/);
  assert.match(css, /\.paid-checkout-callout\{margin:0 0 18px;padding:12px 13px/);
});

test('v0.6.16 release version stays aligned', async () => {
  const [pkg, app, adminView, bookView, legalView, theme, release] = await Promise.all([
    source('package.json'), source('src/app.js'), source('src/views/admin.js'), source('src/views/book.js'), source('src/views/legal.js'), source('theme-extension-source/public/appointment-lite.js'), source('scripts/build-release.sh')
  ]);
  assert.equal(JSON.parse(pkg).version, '0.7.0');
  assert.match(app, /version: '0.7.0'/);
  assert.match(adminView, /styles\.css\?v=0.7.0/);
  assert.match(bookView, /styles\.css\?v=0.7.0/);
  assert.match(legalView, /styles\.css\?v=0.7.0/);
  assert.match(theme, /const VERSION = '0.7.0'/);
  assert.match(release, /RELEASE_VERSION="0.7.0"/);
  assert.match(release, /shopline-subscription-integration/);
});
