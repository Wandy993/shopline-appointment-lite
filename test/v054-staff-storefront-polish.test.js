import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('staff workspace exposes list and calendar schedule views', async () => {
  const [view, app, styles, routes] = await Promise.all([
    read('../src/views/admin.js'), read('../public/admin/app.js'), read('../public/admin/styles.css'), read('../src/routes/admin.js')
  ]);
  assert.match(view, /data-staff-ops-view="list"/);
  assert.match(view, /data-staff-ops-view="calendar"/);
  assert.match(app, /function renderStaffOperationsCalendar/);
  assert.match(app, /staff-calendar-block/);
  assert.match(styles, /\.staff-calendar\{/);
  assert.match(styles, /\.staff-calendar-track\{/);
  assert.match(routes, /occurrences duration buffer location staff staffId/);
});

test('staff presets use bundled AI-generated portrait assets and keep custom upload support', async () => {
  const [server, admin, hosted, theme] = await Promise.all([
    read('../src/app.js'), read('../public/admin/app.js'), read('../public/book/app.js'), read('../theme-extension-source/public/appointment-lite.js')
  ]);
  assert.match(server, /\/assets\/staff/);
  assert.match(admin, /staff-1\.webp/);
  assert.match(hosted, /\/assets\/staff\/\$\{file\}\?v=0\.5\.4-hotfix\.1/);
  assert.match(theme, /\$\{API_BASE\}\/assets\/staff\/\$\{file\}\?v=0\.5\.4-hotfix\.1/);
  assert.match(admin, /processStaffAvatarFile/);
  for (let i = 1; i <= 8; i += 1) {
    const info = await stat(new URL(`../public/staff-avatars/staff-${i}.webp`, import.meta.url));
    assert.ok(info.size > 10000);
  }
});

test('storefront modal fixes selected slots, floating pickers, success sizing, and mobile sheets', async () => {
  const [themeJs, themeCss, hostedCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'), read('../theme-extension-source/public/appointment-lite.css'), read('../public/book/styles.css')
  ]);
  assert.match(themeJs, /const VERSION = '0\.5\.4-hotfix\.1'/);
  assert.match(themeJs, /positionTimezoneMenu/);
  assert.match(themeJs, /dialog\.classList\.add\('al-confirmed'\)/);
  assert.match(themeCss, /\.al-time\[aria-pressed=true\] span\{[^}]*color:#fff!important/);
  assert.match(themeCss, /\.al-timezone-menu\{position:fixed;z-index:100000/);
  assert.match(themeCss, /\.al-booking-dialog\.al-confirmed\{[^}]*height:auto!important/);
  assert.match(themeCss, /@media\(max-width:540px\)[\s\S]*?\.al-timezone-menu,.al-staff-menu\{position:fixed!important/);
  assert.match(hostedCss, /\.time-slot\[aria-pressed=true\] span\{[^}]*color:#fff!important/);
  assert.match(hostedCss, /@media\(max-width:620px\)[\s\S]*?\.timezone-picker-menu,.staff-picker-menu\{position:fixed!important/);
});
