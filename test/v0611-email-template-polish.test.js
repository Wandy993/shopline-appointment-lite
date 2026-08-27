import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v0.6.11 email brand header uses email-safe aligned spacing instead of flexbox', async () => {
  const email = await source('src/services/email.js');
  assert.match(email, /function emailBrandHeader\(settings\)/);
  assert.match(email, /<table role="presentation" width="100%"/);
  assert.match(email, /<td width="14"/);
  assert.match(email, /vertical-align:middle/);
  assert.doesNotMatch(email, /padding:22px 26px 18px;display:flex;align-items:center;gap:11px/);
});

test('v0.6.11 Google Calendar email action uses the official multicolor Google asset and neutral provider styling', async () => {
  const email = await source('src/services/email.js');
  assert.match(email, /www\.gstatic\.com\/firebasejs\/ui\/2\.0\.0\/images\/auth\/google\.svg/);
  assert.match(email, /border:1px solid #DADCE0/);
  assert.match(email, /background:#FFFFFF;color:#3C4043/);
  assert.match(email, /Add to Google Calendar/);
  assert.doesNotMatch(email, /background:\$\{settings\.accentColor\};color:#fff[^`]*Add to Google Calendar/);
});

test('v0.6.11 Email Studio preview mirrors calendar branding and keeps cancellation calendar-free', async () => {
  const [admin, styles] = await Promise.all([source('public/admin/app.js'), source('public/admin/styles.css')]);
  assert.match(admin, /confirmation: \{ label: 'Confirmation', manage: true, calendar: true \}/);
  assert.match(admin, /cancelled: \{ label: 'Cancelled', manage: false, calendar: false \}/);
  assert.match(admin, /preview-google-calendar-button/);
  assert.match(admin, /googleGMark\('small'\)/);
  assert.match(styles, /\.preview-brand\{gap:13px;align-items:center\}/);
  assert.match(styles, /\.preview-google-calendar-button\{/);
});

test('current release stays aligned after v0.6.11 email template polish', async () => {
  const [pkg, app, adminView, bookView, legalView, theme, release] = await Promise.all([
    source('package.json'), source('src/app.js'), source('src/views/admin.js'), source('src/views/book.js'), source('src/views/legal.js'), source('theme-extension-source/public/appointment-lite.js'), source('scripts/build-release.sh')
  ]);
  assert.equal(JSON.parse(pkg).version, '0.6.12');
  assert.match(app, /version: '0\.6\.12'/);
  assert.match(adminView, /styles\.css\?v=0\.6\.12/);
  assert.match(bookView, /styles\.css\?v=0\.6\.12/);
  assert.match(legalView, /styles\.css\?v=0\.6\.12/);
  assert.match(theme, /const VERSION = '0\.6\.12'/);
  assert.match(release, /RELEASE_VERSION="0\.6\.12"/);
  assert.match(release, /storefront-cta-layout-polish/);
});
