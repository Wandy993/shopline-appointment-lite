import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin binds multi-element collections with the all-elements selector helper', async () => {
  const app = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');

  assert.match(app, /\$\$\('\.nav-item'\)\.forEach/);
  assert.match(app, /\$\$\('\[data-close-subscription-dialog\]'\)\.forEach/);
  assert.doesNotMatch(app, /(^|\n)\s*\$\([^)]*\)\.forEach\s*\(/);
});
