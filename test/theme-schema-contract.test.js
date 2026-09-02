import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

function parseSchema(source, label) {
  const match = source.match(/\{\{#schema\}\}\s*([\s\S]*?)\s*\{\{\/schema\}\}/);
  assert.ok(match, `${label} schema should be parseable`);
  return JSON.parse(match[1]);
}

test('Theme block contract validates asset membership and ordering without assuming a single stylesheet', async () => {
  const cases = [
    ['appointment-lite.html', 'public/appointment-lite.css'],
    ['appointment-lite-booking.html', 'public/appointment-lite-page.css'],
    ['appointment-lite-staff-directory.html', 'public/appointment-lite-page.css'],
    ['appointment-lite-embed.html', 'public/appointment-lite-embed.css']
  ];

  for (const [name, uiCss] of cases) {
    const source = await read(`../theme-extension-source/blocks/${name}`);
    const schema = parseSchema(source, name);
    assert.ok(Array.isArray(schema.stylesheet), `${name} stylesheet should be an array`);
    assert.ok(schema.stylesheet.includes('public/appointment-lite-fonts.css'), `${name} should load shared font CSS`);
    assert.ok(schema.stylesheet.includes(uiCss), `${name} should load ${uiCss}`);
    assert.ok(schema.stylesheet.indexOf('public/appointment-lite-fonts.css') < schema.stylesheet.indexOf(uiCss), `${name} should load fonts before UI CSS`);
    assert.ok(schema.stylesheet.every(asset => asset.endsWith('.css')), `${name} should reference only CSS stylesheets`);
    assert.ok(Array.isArray(schema.javascript) && schema.javascript.every(asset => asset.endsWith('.js')), `${name} should reference JS assets through javascript`);
  }
});

test('Product App Block stays zero-configuration while allowing additive presentation assets', async () => {
  const source = await read('../theme-extension-source/blocks/appointment-lite.html');
  const schema = parseSchema(source, 'appointment-lite.html');
  assert.deepEqual(schema.settings, []);
  assert.deepEqual(schema.javascript, ['public/appointment-lite.js']);
  assert.doesNotMatch(source, /block\.settings/);
});
