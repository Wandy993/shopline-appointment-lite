import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('merchant admin uses the Mist Teal light design system', async () => {
  const css = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(css, /v0\.2\.7 Mist Teal UI System Refresh/);
  assert.match(css, /--bg:#f4f8f7/);
  assert.match(css, /--brand:#2e7d73/);
  assert.match(css, /\.sidebar\{[^}]*background:#eef6f3/);
  assert.match(css, /\.primary,\.button-link\{[^}]*background:var\(--brand\)/);
  assert.match(css, /\.hero-orbit\{display:none\}/);
  assert.match(css, /\.service-grid\{grid-template-columns:1fr/);
});

test('Mist Teal refresh keeps blue and amber status accents', async () => {
  const css = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.stat-icon\.cyan\{color:#2879a8/);
  assert.match(css, /\.stat-icon\.amber\{color:#9a661f/);
  assert.match(css, /--danger:#b84652/);
});
