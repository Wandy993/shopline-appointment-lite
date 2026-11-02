import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('merchant admin uses the v0.8.15 design tokens and typography stack', async () => {
  const css = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(css, /v0\.8\.15 — Admin Design System Standardization/);
  assert.match(css, /--bg-color:\s*#f9fafb/);
  assert.match(css, /--card-bg:\s*#ffffff/);
  assert.match(css, /--text-main:\s*#111827/);
  assert.match(css, /--text-muted:\s*#6b7280/);
  assert.match(css, /--accent:\s*#4f46e5/);
  assert.match(css, /--accent-hover:\s*#4338ca/);
  assert.match(css, /--border:\s*#e5e7eb/);
  assert.match(css, /--danger:\s*#dc2626/);
  assert.match(css, /--danger-border:\s*#fca5a5/);
  assert.match(css, /--font-sans:"Plus Jakarta Sans"/);
  assert.match(css, /--font-mono:"JetBrains Mono"/);
});

test('merchant admin normalizes typography, form controls, and responsive configuration layout', async () => {
  const css = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.page-heading h1,\.hero-copy h1\{[^}]*font-size:20px/);
  assert.match(css, /\.panel-head h2,\.section-title h2[^}]*font-size:16px/);
  assert.match(css, /\.app-shell \.storefront-config-title strong\{[^}]*font-size:16px;font-weight:600/);
  assert.match(css, /\.app-shell \.storefront-config-title small\{[^}]*font-size:13px/);
  assert.match(css, /\.app-shell button[^}]*font-size:14px[^}]*border-radius:6px/);
  assert.match(css, /\.app-shell input:not\(\[type=checkbox\]\)[^}]*font-size:14px[^}]*border-radius:6px/);
  assert.match(css, /\.app-shell code[^}]*font-family:var\(--font-mono\);font-size:13px/);
  assert.match(css, /\.config-layout,\.configuration-layout,\.settings-layout,\.setup-layout\{display:grid;grid-template-columns:280px minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:960px\)\{\.config-layout/);
  assert.match(css, /\.app-shell \.form-section,\.app-shell \.storefront-config-group\{display:grid;grid-template-columns:280px minmax\(0,1fr\)/);
  assert.match(css, /\.app-shell \.form-section>:not\(\.section-title\),\.app-shell \.storefront-config-group>:not\(\.storefront-config-title\)\{grid-column:2/);
  assert.match(css, /@media\(max-width:960px\)\s*\{\s*\.app-shell \.form-section/);
});

test('admin font loading is scoped to the merchant admin and allowed by CSP', async () => {
  const [view, app, css] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(view, /fonts\.googleapis\.com\/css2\?family=JetBrains\+Mono/);
  assert.match(view, /family=Plus\+Jakarta\+Sans/);
  assert.match(app, /https:\/\/fonts\.googleapis\.com/);
  assert.match(app, /https:\/\/fonts\.gstatic\.com/);
  assert.match(css, /\.email-preview,\.email-preview button,\.email-preview a,\.preview-mail-shell,\.preview-mail-shell \*\{font-family:"Poppins"/);
  assert.match(css, /\.preview-email-card h2\{font-family:"Jost"/);
});
