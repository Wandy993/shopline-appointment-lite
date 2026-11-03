import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Book Service trigger uses medium weight without changing booking form submit buttons', async () => {
  const [css, storefront] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../theme-extension-source/public/appointment-lite.js')
  ]);

  const sharedButtonRule = css.match(/\.al-trigger,\.al-submit\{[^}]+\}/)?.[0] || '';
  assert.match(sharedButtonRule, /font-weight:600/);
  assert.match(css, /\.al-widget \.al-trigger\{font-weight:500\}/);
  assert.doesNotMatch(css, /\.al-widget \.al-submit\s*\{/);
  assert.match(storefront, /class="al-trigger"/);
  assert.match(css, /\.al-submit\{width:100%\}/);
});
