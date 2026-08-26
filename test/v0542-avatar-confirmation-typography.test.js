import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('storefront confirmation modal releases the booking form flex height', async () => {
  const css = await read('../theme-extension-source/public/appointment-lite.css');
  assert.match(css, /\.al-booking-dialog\.al-confirmed \.al-form\{[^}]*flex:0 0 auto!important[^}]*height:auto!important/);
  assert.match(css, /\.al-booking-dialog\.al-confirmed\{[^}]*width:min\(560px[^}]*min-height:0!important/);
});

test('all storefront controls use the same system sans typography as the service title', async () => {
  const [themeCss, hostedCss] = await Promise.all([read('../theme-extension-source/public/appointment-lite.css'), read('../public/book/styles.css')]);
  assert.match(themeCss, /\.al-dialog,.al-dialog button,.al-dialog input,.al-dialog textarea,.al-dialog select/);
  assert.match(themeCss, /BlinkMacSystemFont/);
  assert.match(hostedCss, /button,input,textarea,select,option\{font:inherit\}/);
});

test('staff portrait replacements remain bundled non-thumbnail WebP assets', async () => {
  for (let index = 1; index <= 8; index += 1) {
    const info = await stat(new URL(`../public/staff-avatars/staff-${index}.webp`, import.meta.url));
    assert.ok(info.size > 10000, `staff-${index}.webp should remain a non-thumbnail portrait asset`);
  }
});
