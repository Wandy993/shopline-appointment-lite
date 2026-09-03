import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.6 staff selector uses a content-sized dialog shell with a scroll cap', async () => {
  const css = await read('../theme-extension-source/public/appointment-lite.css');
  assert.match(css, /\.al-dialog\[open\]\.al-staff-directory-dialog\{[\s\S]*?display:block!important;[\s\S]*?height:fit-content!important;/);
  assert.match(css, /\.al-staff-directory-dialog>\.al-directory-body\{[\s\S]*?height:auto!important;[\s\S]*?max-height:min\(560px,calc\(100dvh - 168px\)\)!important;/);
});

test('v0.8.6 confirmation calendar action is compact on Theme and hosted booking surfaces', async () => {
  const [themeCss, hostedCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../public/book/styles.css')
  ]);
  assert.match(themeCss, /\.al-booking-dialog\.al-confirmed \.al-calendar-link\{[\s\S]*?width:auto!important;[\s\S]*?min-height:42px!important;/);
  assert.match(themeCss, /\.al-booking-dialog\.al-confirmed \.al-calendar-link-label\{flex:0 1 auto!important;text-align:center!important;/);
  assert.match(hostedCss, /\.success-calendar-actions \.calendar-link\{[\s\S]*?width:auto!important;[\s\S]*?min-height:42px!important;/);
});

test('v0.8.6 confirmed product booking owns the widget state and suppresses Book Service', async () => {
  const [themeJs, themeCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../theme-extension-source/public/appointment-lite.css')
  ]);
  assert.match(themeJs, /widget\.classList\.add\('al-widget--booked'\)/);
  assert.match(themeJs, /trigger\.style\.setProperty\('display', 'none', 'important'\)/);
  assert.match(themeJs, /widget\.classList\.remove\('al-widget--booked'\)/);
  assert.match(themeCss, /\.al-trigger\[hidden\],\.al-widget\.al-widget--booked>\.al-trigger\{display:none!important\}/);
  assert.match(themeCss, /\.al-widget\.al-widget--booked \.al-booked\{/);
});
