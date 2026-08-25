import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('merchant admin uses the Arctic Blue light design system', async () => {
  const css = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(css, /v0\.2\.8 Arctic Blue UI System Refresh/);
  assert.match(css, /--bg:#f5f8fc/);
  assert.match(css, /--brand:#2f6fed/);
  assert.match(css, /\.sidebar\{[^}]*background:#f8fbff/);
  assert.match(css, /\.primary,\.button-link\{[^}]*background:var\(--brand\)/);
  assert.match(css, /\.hero-panel\{[^}]*#f2f6ff/);
  assert.match(css, /\.hero-orbit\{display:none\}/);
  assert.match(css, /\.service-grid\{grid-template-columns:1fr/);
});

test('Arctic Blue keeps semantic green and amber status accents', async () => {
  const css = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(css, /--green:#2d8c6f/);
  assert.match(css, /\.stat-icon\.amber\{color:#9a661f/);
  assert.match(css, /\.status-badge\.success[^}]*#e8f5ef/);
  assert.match(css, /--danger:#b84652/);
});
