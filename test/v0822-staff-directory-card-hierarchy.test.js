import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Product App Block staff cards prioritize profile and Select before secondary services', async () => {
  const [asset, css] = await Promise.all([read('../theme-extension-source/public/appointment-lite.js'), read('../theme-extension-source/public/appointment-lite.css')]);
  const start = asset.indexOf('function openStaffDirectory(');
  const end = asset.indexOf('\n  async function init(', start);
  const markup = asset.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(markup, /al-directory-person[\s\S]*al-directory-book[\s\S]*al-directory-services/);
  assert.match(markup, /al-directory-expertise-chip/);
  assert.doesNotMatch(markup, /<strong>Expertise<\/strong>/);
  assert.match(css, /grid-template-areas:"person button" "services services"/);
  assert.match(css, /\.al-directory-person-copy \.al-directory-bio\{[\s\S]*-webkit-line-clamp:2/);
  assert.match(css, /\.al-directory-services-list li\{[\s\S]*border-radius:999px/);
});

test('Page Block uses the same profile, CTA and services hierarchy', async () => {
  const [asset, css] = await Promise.all([read('../theme-extension-source/public/appointment-lite-page.js'), read('../theme-extension-source/public/appointment-lite-page.css')]);
  const start = asset.indexOf('function staffCard(');
  const end = asset.indexOf('\n  async function directory(', start);
  const markup = asset.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(markup, /al-dir-person[\s\S]*al-dir-select[\s\S]*al-dir-services/);
  assert.match(markup, /al-dir-expertise-chip/);
  assert.doesNotMatch(markup, /<strong>Expertise<\/strong>/);
  assert.match(css, /grid-template-areas:"person cta" "services services"/);
  assert.match(css, /\.al-dir-person-copy \.al-dir-bio\{[\s\S]*-webkit-line-clamp:2/);
  assert.match(css, /\.al-dir-services-list li\{[\s\S]*border-radius:999px/);
});

test('Staff Directory keeps public-profile filtering and private contact data unchanged', async () => {
  const staffing = await read('../src/services/staffing.js');
  assert.match(staffing, /staff\.filter\(item => item\.publicProfile === true\)/);
  assert.match(staffing, /expertise: publicProfileText\(item\.expertise\)/);
  assert.match(staffing, /bio: publicProfileText\(item\.bio\)/);
  assert.doesNotMatch(staffing, /email: item\.email[\s\S]*publicStaffDirectory/);
  assert.doesNotMatch(staffing, /phone: item\.phone[\s\S]*publicStaffDirectory/);
});
