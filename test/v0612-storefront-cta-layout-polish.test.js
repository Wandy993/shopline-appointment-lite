import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_STOREFRONT_SETTINGS, normalizeStorefrontSettings, validateStorefrontSettings } from '../src/lib/storefront-settings.js';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v0.6.12 defaults the booking primary action to compact right alignment on desktop', () => {
  const settings = normalizeStorefrontSettings({});
  assert.equal(settings.modal.primaryButtonWidth, 'content');
  assert.equal(settings.modal.primaryButtonAlignment, 'right');
  assert.equal(DEFAULT_STOREFRONT_SETTINGS.modal.primaryButtonWidth, 'content');
  assert.equal(DEFAULT_STOREFRONT_SETTINGS.modal.primaryButtonAlignment, 'right');
  const custom = normalizeStorefrontSettings({ modal: { primaryButtonWidth: 'full', primaryButtonAlignment: 'center' } });
  assert.equal(custom.modal.primaryButtonWidth, 'full');
  assert.equal(custom.modal.primaryButtonAlignment, 'center');
  const invalid = validateStorefrontSettings({ modal: { primaryButtonWidth: 'wide', primaryButtonAlignment: 'bottom' } });
  assert.match(invalid.errors.join(' '), /supported booking action width/);
  assert.match(invalid.errors.join(' '), /supported booking action alignment/);
});

test('v0.6.12 persists storefront primary action layout per shop', async () => {
  const model = await source('src/models/Shop.js');
  assert.match(model, /primaryButtonWidth:\s*\{ type: String, enum: \['content', 'full'\], default: 'content' \}/);
  assert.match(model, /primaryButtonAlignment:\s*\{ type: String, enum: \['left', 'center', 'right'\], default: 'right' \}/);
});

test('v0.6.12 hosted booking page keeps desktop CTA compact and right aligned while mobile remains full width', async () => {
  const [app, css] = await Promise.all([source('public/book/app.js'), source('public/book/styles.css')]);
  assert.match(app, /bookingActions\.dataset\.ctaWidth = storefront\.modal\.primaryButtonWidth/);
  assert.match(app, /bookingActions\.dataset\.ctaAlign = storefront\.modal\.primaryButtonAlignment/);
  assert.match(css, /data-cta-width="content"\] \.primary/);
  assert.match(css, /min-width:190px/);
  assert.match(css, /data-cta-align="right"\]\{align-items:flex-end\}/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*width:100%/);
});

test('v0.6.12 Theme booking dialog uses the same CTA layout and mobile safety rule', async () => {
  const [theme, css] = await Promise.all([source('theme-extension-source/public/appointment-lite.js'), source('theme-extension-source/public/appointment-lite.css')]);
  assert.match(theme, /dialog\.dataset\.alPrimaryWidth = settings\.modal\.primaryButtonWidth/);
  assert.match(theme, /dialog\.dataset\.alPrimaryAlign = settings\.modal\.primaryButtonAlignment/);
  assert.match(css, /data-al-primary-width="content"\] \.al-actions \.al-submit/);
  assert.match(css, /data-al-primary-align="right"\] \.al-actions\{align-items:flex-end\}/);
  assert.match(css, /@media\(max-width:540px\)[\s\S]*width:100%/);
});

test('v0.6.12 Storefront Setup exposes primary action width and alignment with live preview', async () => {
  const [view, app, css] = await Promise.all([source('src/views/admin.js'), source('public/admin/app.js'), source('public/admin/styles.css')]);
  for (const id of ['storefrontPrimaryWidthOptions', 'storefrontPrimaryAlignmentOptions', 'storefrontPrimaryWidth', 'storefrontPrimaryAlignment']) {
    assert.ok(view.includes(`id="${id}"`), `missing ${id}`);
  }
  assert.match(app, /function setStorefrontPrimaryWidth/);
  assert.match(app, /function setStorefrontPrimaryAlignment/);
  assert.match(app, /primaryButtonWidth: \$\('#storefrontPrimaryWidth'\)/);
  assert.match(app, /primaryButtonAlignment:/);
  assert.match(css, /v0.6.12 — Storefront CTA Layout Polish/);
  assert.match(css, /storefront-dialog-preview-actions\.align-right\{align-items:flex-end\}/);
});

test('v0.6.12 release version stays aligned across app surfaces', async () => {
  const [pkg, app, adminView, bookView, legalView, theme, release] = await Promise.all([
    source('package.json'), source('src/app.js'), source('src/views/admin.js'), source('src/views/book.js'), source('src/views/legal.js'), source('theme-extension-source/public/appointment-lite.js'), source('scripts/build-release.sh')
  ]);
  assert.equal(JSON.parse(pkg).version, '0.8.1');
  assert.match(app, /version: '0.8.1'/);
  assert.match(adminView, /styles\.css\?v=0.8.1/);
  assert.match(bookView, /styles\.css\?v=0.8.1/);
  assert.match(legalView, /styles\.css\?v=0.8.1/);
  assert.match(theme, /const VERSION = '0.8.1'/);
  assert.match(release, /RELEASE_VERSION="0.8.1"/);
  assert.match(release, /booking-model-storefront-placement/);
});
