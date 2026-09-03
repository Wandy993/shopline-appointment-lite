import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_STOREFRONT_SETTINGS, normalizeStorefrontSettings, validateStorefrontSettings } from '../src/lib/storefront-settings.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.5 defaults to Warm Luxe and validates booking appearance templates', () => {
  const defaults = normalizeStorefrontSettings({});
  assert.equal(defaults.appearance.template, 'warm_luxe');
  assert.equal(defaults.appearance.backgroundIntensity, 'medium');
  assert.equal(defaults.appearance.cornerStyle, 'rounded');
  assert.equal(defaults.appearance.primaryStyle, 'template');
  assert.equal(defaults.appearance.unifiedBookingFlow, true);
  assert.deepEqual(defaults, JSON.parse(JSON.stringify(DEFAULT_STOREFRONT_SETTINGS)));

  const custom = normalizeStorefrontSettings({ appearance: { template: 'soft_editorial', backgroundIntensity: 'strong', cornerStyle: 'square_soft', primaryStyle: 'custom', unifiedBookingFlow: false } });
  assert.equal(custom.appearance.template, 'soft_editorial');
  assert.equal(custom.appearance.backgroundIntensity, 'strong');
  assert.equal(custom.appearance.cornerStyle, 'square_soft');
  assert.equal(custom.appearance.primaryStyle, 'custom');
  assert.equal(custom.appearance.unifiedBookingFlow, false);

  const invalid = validateStorefrontSettings({ appearance: { template: 'neon', backgroundIntensity: 'maximum', cornerStyle: 'circle', primaryStyle: 'random' } });
  assert.match(invalid.errors.join(' '), /visual template/);
  assert.match(invalid.errors.join(' '), /background intensity/);
  assert.match(invalid.errors.join(' '), /corner style/);
  assert.match(invalid.errors.join(' '), /primary action style/);
});

test('v0.8.5 persists appearance settings and exposes them to all public booking surfaces', async () => {
  const [model, route] = await Promise.all([read('../src/models/Shop.js'), read('../src/routes/public.js')]);
  assert.match(model, /storefrontAppearanceSettingsSchema/);
  assert.match(model, /minimal_light', 'warm_luxe', 'soft_editorial/);
  assert.match(model, /unifiedBookingFlow:\s*\{ type: Boolean, default: true \}/);
  assert.match(route, /staff: directory\.options,\s*storefront: normalizeStorefrontSettings/);
  assert.match(route, /embed-services/);
  assert.match(route, /const storefront = normalizeStorefrontSettings\(shop\.storefrontSettings \|\| \{\}\);/);
  assert.match(route, /res\.json\(\{[\s\S]*?services:[\s\S]*?storefront[\s\S]*?\}\);/);
});

test('v0.8.5 Storefront Setup offers three templates, intensity, corners, unified flow, and live theme preview', async () => {
  const [view, app, css] = await Promise.all([read('../src/views/admin.js'), read('../public/admin/app.js'), read('../public/admin/styles.css')]);
  for (const id of ['storefrontThemeOptions','storefrontTheme','storefrontIntensityOptions','storefrontBackgroundIntensity','storefrontCornerOptions','storefrontCornerStyle','storefrontPrimaryStyleOptions','storefrontPrimaryStyle','storefrontUnifiedFlow']) {
    assert.ok(view.includes(`id="${id}"`), `missing ${id}`);
  }
  assert.match(view, /Minimal Light/);
  assert.match(view, /Warm Luxe/);
  assert.match(view, /Soft Editorial/);
  assert.match(app, /const storefrontThemePresets/);
  assert.match(app, /function storefrontThemeTokens/);
  assert.match(app, /function setStorefrontTheme/);
  assert.match(app, /booking-theme-bg/);
  assert.match(css, /booking-theme-grid/);
  assert.match(css, /theme-luxe/);
});

test('v0.8.5 fixes the staff editor modal empty-space regression with a content-sized shell', async () => {
  const css = await read('../public/admin/styles.css');
  assert.match(css, /\.staff-modal\{height:auto;max-height:min\(90dvh,860px\);overflow:hidden\}/);
  assert.match(css, /\.staff-modal form\{height:auto;max-height:min\(90dvh,860px\)/);
  assert.match(css, /\.staff-modal \.modal-body\{flex:1 1 auto;min-height:0/);
});

test('v0.8.5 applies one booking theme across staff selector, calendar, details, and confirmation', async () => {
  const [themeJs, themeCss, bookJs, bookCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../public/book/app.js'),
    read('../public/book/styles.css')
  ]);
  assert.match(themeJs, /bookingThemePresets/);
  assert.match(themeJs, /applyThemeVariables\(dialog, settings, \{ bookingStep: variant === 'al-booking-dialog' \}\)/);
  assert.match(themeJs, /unifiedBookingFlow/);
  assert.match(themeCss, /al-staff-directory-dialog[^{]*\{/);
  assert.match(themeCss, /--al-theme-bg/);
  assert.match(themeCss, /\.al-calendar-card/);
  assert.match(themeCss, /\.al-success-mark/);
  assert.match(bookJs, /function applyBookingTheme/);
  assert.match(bookJs, /unifiedBookingFlow/);
  assert.match(bookCss, /--booking-bg/);
  assert.match(bookCss, /\.booking-card/);
  assert.match(bookCss, /\.success-state #successDetails/);
});

test('v0.8.5 Page and App Embed placements inherit the same storefront appearance', async () => {
  const [pageJs, pageCss, embedJs, embedCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite-page.js'),
    read('../theme-extension-source/public/appointment-lite-page.css'),
    read('../theme-extension-source/public/appointment-lite-embed.js'),
    read('../theme-extension-source/public/appointment-lite-embed.css')
  ]);
  assert.match(pageJs, /const applyTheme = \(root, storefront = \{\}\)/);
  assert.match(pageJs, /applyTheme\(root, payload\.storefront \|\| \{\}\)/);
  assert.match(pageCss, /--al-page-bg/);
  assert.match(embedJs, /function applyTheme\(root, storefront = \{\}\)/);
  assert.match(embedJs, /applyTheme\(root, payload\.storefront \|\| \{\}\)/);
  assert.match(embedCss, /--al-embed-bg/);
});
