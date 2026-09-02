import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.1.4.2 documents the rejected standalone-font packaging path without owning the active implementation', async () => {
  const syncScript = await read('../scripts/sync-theme-fonts.mjs');
  assert.doesNotMatch(syncScript, /\.ttf'\]|\.ttf"\]/);
  assert.match(syncScript, /standalone font binaries/i);
});
