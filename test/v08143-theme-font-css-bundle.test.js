import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const read = value => readFile(new URL(value, import.meta.url), 'utf8');

test('v0.8.1.4.3 packages Theme Extension fonts inside a supported CSS asset', async () => {
  const [fontCss, syncScript, modalCss, pageCss, embedCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite-fonts.css'),
    read('../scripts/sync-theme-fonts.mjs'),
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../theme-extension-source/public/appointment-lite-page.css'),
    read('../theme-extension-source/public/appointment-lite-embed.css')
  ]);
  assert.match(fontCss, /data:font\/woff2;base64,/);
  assert.match(fontCss, /font-family:"Jost"/);
  assert.match(fontCss, /font-family:"Poppins"/);
  assert.match(syncScript, /toString\('base64'\)/);
  assert.match(syncScript, /appointment-lite-fonts\.css/);
  for (const css of [modalCss, pageCss, embedCss]) {
    assert.doesNotMatch(css, /@font-face/);
    assert.doesNotMatch(css, /\.(?:woff2|woff|ttf|otf)/);
  }
});

test('v0.8.1.4.3 every customer Theme block loads the shared font CSS before its UI stylesheet', async () => {
  const blocks = [
    '../theme-extension-source/blocks/appointment-lite.html',
    '../theme-extension-source/blocks/appointment-lite-booking.html',
    '../theme-extension-source/blocks/appointment-lite-staff-directory.html',
    '../theme-extension-source/blocks/appointment-lite-embed.html'
  ];
  for (const rel of blocks) {
    const source = await read(rel);
    const fontIndex = source.indexOf('public/appointment-lite-fonts.css');
    const uiIndex = source.search(/public\/appointment-lite(?:-page|-embed)?\.css/);
    assert.ok(fontIndex >= 0, `${rel} should include font CSS`);
    assert.ok(uiIndex > fontIndex, `${rel} should load font CSS before UI CSS`);
  }
});

test('v0.8.1.4.3 Theme Extension public directory uses only CLI-supported file extensions', async () => {
  const dir = new URL('../theme-extension-source/public/', import.meta.url);
  const names = await readdir(dir);
  const allowed = new Set(['.css', '.js', '.jpg', '.png', '.svg']);
  const invalid = names.filter(name => !allowed.has(path.extname(name).toLowerCase()));
  assert.deepEqual(invalid, []);
});
