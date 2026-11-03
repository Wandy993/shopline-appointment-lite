import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Product staff directory keeps Services in the right-hand column on desktop', async () => {
  const [asset, css] = await Promise.all([read('../theme-extension-source/public/appointment-lite.js'), read('../theme-extension-source/public/appointment-lite.css')]);
  const start = asset.indexOf('function openStaffDirectory(');
  const end = asset.indexOf('\n  async function init(', start);
  const markup = asset.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(markup, /al-directory-person[\s\S]*al-directory-book[\s\S]*al-directory-services/);
  assert.match(markup, /<p class="al-directory-expertise"><strong>Expertise<\/strong>/);
  assert.doesNotMatch(markup, /al-directory-expertise-chip/);
  assert.match(css, /\.al-directory-card\{display:grid;grid-template-columns:minmax\(210px,\.8fr\) minmax\(280px,1\.25fr\) 90px/);
  assert.match(css, /grid-template-columns:minmax\(190px,\.82fr\) minmax\(240px,1\.18fr\) 78px/);\n  assert.match(css, /grid-template-areas:"person services button"/);
  assert.doesNotMatch(css, /\.al-directory-services-list li\{display:inline-flex/);
  assert.doesNotMatch(css, /\.al-directory-book\{grid-area:button;align-self:start;justify-self:end;display:inline-flex;align-items:center;justify-content:center/);
});

test('Standalone Staff Directory keeps Services in the right-hand column on desktop', async () => {
  const [asset, css] = await Promise.all([read('../theme-extension-source/public/appointment-lite-page.js'), read('../theme-extension-source/public/appointment-lite-page.css')]);
  const start = asset.indexOf('function staffCard(');
  const end = asset.indexOf('\n  async function directory(', start);
  const markup = asset.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(markup, /al-dir-person[\s\S]*al-dir-select[\s\S]*al-dir-services/);
  assert.match(markup, /<span><strong>Expertise<\/strong>/);
  assert.doesNotMatch(markup, /al-dir-expertise-chip/);
  assert.match(css, /\.al-dir-tags span\{border:1px solid #d9e5f7;border-radius:999px/);
  assert.match(css, /-webkit-line-clamp:3/);
  assert.match(css, /grid-template-columns:minmax\(190px,\.82fr\) minmax\(240px,1\.18fr\) 90px/);\n  assert.match(css, /grid-template-areas:"person services cta"/);
});

test('Booking dialog scrolls the complete form body while keeping action footer separate', async () => {
  const css = await read('../theme-extension-source/public/appointment-lite.css');
  assert.match(css, /\.al-booking-dialog:not\(\.al-confirmed\) \.al-form-body\{[\s\S]*overflow-y:auto!important/);
  assert.match(css, /\.al-booking-dialog:not\(\.al-confirmed\) \.al-booking-layout\{[\s\S]*height:auto!important/);
  assert.match(css, /\.al-booking-dialog:not\(\.al-confirmed\) \.al-booking-panel\{[\s\S]*overflow:visible!important/);
  assert.match(css, /\.al-actions\{flex:0 0 auto/);
  assert.match(css, /padding-bottom:20px!important/);
  assert.match(css, /-webkit-overflow-scrolling:touch/);
});

test('Staff Directory keeps public profile filtering and private contact data unchanged', async () => {
  const staffing = await read('../src/services/staffing.js');
  assert.match(staffing, /staff\.filter\(item => item\.publicProfile === true\)/);
  assert.match(staffing, /expertise: publicProfileText\(item\.expertise\)/);
  assert.match(staffing, /bio: publicProfileText\(item\.bio\)/);
  assert.doesNotMatch(staffing, /email: item\.email[\s\S]*publicStaffDirectory/);
  assert.doesNotMatch(staffing, /phone: item\.phone[\s\S]*publicStaffDirectory/);
});
