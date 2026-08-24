import test from 'node:test';
import assert from 'node:assert/strict';
import { buildThemeAppBlockDeepLink } from '../src/lib/theme-deep-link.js';

test('theme deep link opens the product template and activates the App Block', () => {
  const value = buildThemeAppBlockDeepLink({ handle: 'apptest', themeId: 'theme-1', extensionUuid: 'extension-1', blockHandle: 'appointment-lite' });
  const url = new URL(value);
  assert.equal(url.origin, 'https://apptest.myshopline.com');
  assert.equal(url.pathname, '/admin/theme-editor/editing/ProductsDetail');
  assert.equal(url.searchParams.get('themeId'), 'theme-1');
  assert.equal(url.searchParams.get('templateName'), 'templates/product.json');
  assert.equal(url.searchParams.get('activateAppId'), 'extension-1/appointment-lite');
  assert.equal(url.searchParams.get('target'), 'newAppsSection');
});
