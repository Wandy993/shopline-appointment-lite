import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.7 CSS delivery hotfix is emitted as real CSS rather than escaped newline text', async () => {
  const [themeCss, hostedCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../public/book/styles.css')
  ]);
  assert.equal(themeCss.includes('\\n'), false, 'Theme CSS must not contain literal escaped newline sequences');
  assert.equal(hostedCss.includes('\\n'), false, 'Hosted booking CSS must not contain literal escaped newline sequences');
});

test('staff directory dialog is content-sized even when the merchant theme gives dialog a viewport height', async () => {
  const css = await read('../theme-extension-source/public/appointment-lite.css');
  assert.match(css, /\.al-dialog\[open\]\.al-staff-directory-dialog\{[\s\S]*?height:max-content!important;[\s\S]*?block-size:max-content!important;/);
  assert.match(css, /\.al-staff-directory-dialog>\.al-directory-body\{[\s\S]*?height:auto!important;[\s\S]*?overflow-y:auto!important;/);
  assert.match(css, /\.al-staff-directory-dialog>\.al-directory-body>\.al-directory-grid\{[\s\S]*?height:auto!important;[\s\S]*?min-height:0!important;/);
});

test('Google Calendar remains a compact secondary pill on Theme and hosted confirmation surfaces', async () => {
  const [themeCss, hostedCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../public/book/styles.css')
  ]);
  assert.match(themeCss, /\.al-booking-dialog\.al-confirmed \.al-calendar-link\{[\s\S]*?width:max-content!important;[\s\S]*?max-width:min\(100%,260px\)!important;[\s\S]*?border-radius:999px!important;/);
  assert.match(themeCss, /\.al-booking-dialog\.al-confirmed \.al-calendar-link-arrow\{[\s\S]*?display:none!important;/);
  assert.match(hostedCss, /\.success-calendar-actions \.calendar-link\{[\s\S]*?width:max-content!important;[\s\S]*?max-width:min\(100%,260px\)!important;[\s\S]*?border-radius:999px!important;/);
  assert.match(hostedCss, /\.success-calendar-actions \.calendar-link-arrow\{display:none!important\}/);
});
