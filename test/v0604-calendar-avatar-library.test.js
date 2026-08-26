import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.6.0.4 uses a polished Appointment Lite Google Calendar action', async () => {
  const [view, themeJs, hostedCss, themeCss] = await Promise.all([
    read('../src/views/book.js'), read('../theme-extension-source/public/appointment-lite.js'),
    read('../public/book/styles.css'), read('../theme-extension-source/public/appointment-lite.css')
  ]);
  assert.match(view, /calendar-link-label/);
  assert.match(view, /calendar-link-arrow/);
  assert.match(themeJs, /al-calendar-link-label/);
  assert.match(themeJs, /al-calendar-link-arrow/);
  assert.match(hostedCss, /v0\.6\.0\.4 Google Calendar action polish/);
  assert.match(hostedCss, /background:#f3f7ff/);
  assert.match(themeCss, /v0\.6\.0\.4 Google Calendar action polish/);
  assert.match(themeCss, /\.al-google-g\{width:30px;height:30px/);
});

test('v0.6.0.4 ships nine clear bundled staff portraits across admin and storefront', async () => {
  const [validation, staffing, admin, hosted, theme] = await Promise.all([
    read('../src/lib/validation.js'), read('../src/services/staffing.js'), read('../public/admin/app.js'),
    read('../public/book/app.js'), read('../theme-extension-source/public/appointment-lite.js')
  ]);
  for (const source of [validation, staffing, admin, hosted, theme]) assert.match(source, /nova/);
  assert.match(admin, /staff-9\.webp/);
  assert.match(staffing, /staff-9\.webp/);
  for (let i = 1; i <= 9; i += 1) {
    const info = await stat(new URL(`../public/staff-avatars/staff-${i}.webp`, import.meta.url));
    assert.ok(info.size > 20000, `staff-${i}.webp should retain portrait detail`);
    assert.ok(info.size < 150000, `staff-${i}.webp should stay web-friendly`);
  }
});
