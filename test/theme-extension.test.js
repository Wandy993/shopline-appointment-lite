import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('App Block is zero-configuration and uses SHOPLINE resource IDs', async () => {
  const block = await readFile(new URL('../theme-extension-source/blocks/appointment-lite.html', import.meta.url), 'utf8');
  assert.match(block, /data-shop-id="\{\{ shop\.id \}\}"/);
  assert.match(block, /data-product-id="\{\{ product\.id \}\}"/);
  assert.match(block, /"settings": \[\]/);
  assert.doesNotMatch(block, /block\.settings/);
});

test('theme asset exposes diagnostics and handles editor re-renders', async () => {
  const asset = await readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8');
  assert.match(asset, /\[Appointment Lite\]/);
  assert.match(asset, /shopline:section:load/);
  assert.match(asset, /MutationObserver/);
  assert.doesNotMatch(asset, /data\.customer|customer\.email/);
});
