import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STOREFRONT_SETTINGS, normalizeStorefrontSettings, validateStorefrontSettings } from '../src/lib/storefront-settings.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

test('v0.6.9 defaults the product-page appointment button to content width', () => {
  const settings = normalizeStorefrontSettings({});
  assert.equal(settings.button.width, 'content');
  assert.equal(settings.button.alignment, 'left');
  assert.equal(settings.button.backgroundColor, '#2F6FED');
  assert.equal(settings.modal.showPhone, true);
  assert.equal(settings.modal.showNotes, true);
  assert.deepEqual(settings, JSON.parse(JSON.stringify(DEFAULT_STOREFRONT_SETTINGS)));
});

test('v0.6.9 normalizes storefront style values and validates merchant input', () => {
  const settings = normalizeStorefrontSettings({
    button: { label: 'Schedule now', backgroundColor: '#123abc', textColor: '#ffffff', width: 'full', alignment: 'right', borderRadius: 99 },
    modal: { title: 'Choose your time', accentColor: '#F0A010', primaryTextColor: '#101010', showPhone: false, showNotes: false, showTimezoneSelector: false }
  });
  assert.equal(settings.button.backgroundColor, '#123ABC');
  assert.equal(settings.button.width, 'full');
  assert.equal(settings.button.borderRadius, 24);
  assert.equal(settings.modal.showPhone, false);
  assert.equal(settings.modal.showNotes, false);
  assert.equal(settings.modal.showTimezoneSelector, false);

  const invalid = validateStorefrontSettings({ button: { label: '', backgroundColor: 'blue', borderRadius: 30 }, modal: { title: '', accentColor: '#123' } });
  assert.ok(invalid.errors.length >= 4);
});

test('v0.6.9 persists storefront settings per shop and exposes an admin save endpoint', async () => {
  const [model, route] = await Promise.all([source('src/models/Shop.js'), source('src/routes/admin.js')]);
  assert.match(model, /storefrontSettings:\s*\{ type: storefrontSettingsSchema/);
  assert.match(model, /showPhone:\s*\{ type: Boolean, default: true \}/);
  assert.match(route, /storefrontSettings: normalizeStorefrontSettings\(req\.shop\.storefrontSettings \|\| \{\}\)/);
  assert.match(route, /adminRouter\.put\('\/storefront\/settings'/);
  assert.match(route, /validateStorefrontSettings\(req\.body\)/);
});

test('v0.6.9 exposes storefront design settings to product App Blocks and direct booking pages', async () => {
  const route = await source('src/routes/public.js');
  assert.match(route, /storefront: normalizeStorefrontSettings\(result\.shop\.storefrontSettings \|\| \{\}\)/);
  assert.match(route, /publicRouter\.get\('\/rule'/);
  assert.match(route, /publicRouter\.get\('\/service'/);
  assert.match(route, /Cache-Control', 'no-cache'/);
});

test('v0.6.9 merchant admin has a live storefront button and dialog customizer', async () => {
  const [view, app, css] = await Promise.all([source('src/views/admin.js'), source('public/admin/app.js'), source('public/admin/styles.css')]);
  for (const id of ['storefrontButtonLabel','storefrontButtonColor','storefrontButtonWidthOptions','storefrontButtonAlignmentOptions','storefrontModalAccent','storefrontShowPhone','storefrontShowNotes','storefrontShowTimezone','saveStorefrontSettings']) {
    assert.ok(view.includes(`id="${id}"`), `missing ${id}`);
  }
  assert.match(app, /function renderStorefrontPreview\(\)/);
  assert.match(app, /api\('\/storefront\/settings', \{ method: 'PUT'/);
  assert.match(css, /v0\.6\.9 — Storefront button \+ booking dialog customizer/);
});

test('v0.6.9 Theme App Block applies merchant button width colors text and modal visibility', async () => {
  const [theme, css] = await Promise.all([source('theme-extension-source/public/appointment-lite.js'), source('theme-extension-source/public/appointment-lite.css')]);
  assert.match(theme, /widget\.dataset\.alButtonWidth = settings\.button\.width/);
  assert.match(theme, /--al-trigger-bg/);
  assert.match(theme, /--al-trigger-text/);
  assert.match(theme, /--al-trigger-radius/);
  assert.match(theme, /modalSettings\.showPhone/);
  assert.match(theme, /modalSettings\.showNotes/);
  assert.match(theme, /modalSettings\.showTimezoneSelector/);
  assert.match(css, /data-al-button-width="full"/);
  assert.match(css, /--al-trigger-bg/);
  assert.match(css, /\.al-ui-hidden\{display:none!important\}/);
});

test('v0.6.9 direct booking page honors the same dialog appearance and optional field visibility', async () => {
  const [view, app, css] = await Promise.all([source('src/views/book.js'), source('public/book/app.js'), source('public/book/styles.css')]);
  assert.match(view, /id="timezoneNote"/);
  assert.match(view, /id="phoneField"/);
  assert.match(view, /id="notesField"/);
  assert.match(view, /id="bookingFooterNote"/);
  assert.match(app, /normalizeStorefrontSettings\(payload\.storefront \|\| \{\}\)/);
  assert.match(app, /--brand-text/);
  assert.match(app, /showPhone/);
  assert.match(app, /showNotes/);
  assert.match(css, /--brand-text:#fff/);
  assert.match(css, /color:var\(--brand-text,#fff\)/);
});

test('v0.6.9 release versions stay aligned', async () => {
  const [pkgText, adminView, bookView, theme, health, release] = await Promise.all([
    source('package.json'), source('src/views/admin.js'), source('src/views/book.js'), source('theme-extension-source/public/appointment-lite.js'), source('src/app.js'), source('scripts/build-release.sh')
  ]);
  assert.equal(JSON.parse(pkgText).version, '0.6.9');
  assert.match(adminView, /styles\.css\?v=0\.6\.9/);
  assert.match(adminView, /app\.js\?v=0\.6\.9/);
  assert.match(bookView, /styles\.css\?v=0\.6\.9/);
  assert.match(bookView, /app\.js\?v=0\.6\.9/);
  assert.match(theme, /const VERSION = '0\.6\.9'/);
  assert.match(health, /version: '0\.6\.9'/);
  assert.match(release, /RELEASE_VERSION="0\.6\.9"/);
  assert.match(release, /storefront-customizer/);
});
