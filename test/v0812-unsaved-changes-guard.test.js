import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.12 Email Studio and Storefront Setup expose an unsaved state and application-native leave dialog', async () => {
  const [view, app, css] = await Promise.all([
    read('../src/views/admin.js'),
    read('../public/admin/app.js'),
    read('../public/admin/styles.css')
  ]);

  assert.match(view, /id="emailUnsavedBadge"[^>]*>Unsaved changes</);
  assert.match(view, /id="storefrontUnsavedBadge"[^>]*>Unsaved changes</);
  assert.match(view, /id="unsavedChangesDialog"/);
  assert.match(view, /id="keepEditingUnsaved"/);
  assert.match(view, /id="discardUnsaved"/);
  assert.match(view, /id="saveAndLeaveUnsaved"/);

  assert.match(app, /function hasUnsavedChanges\(view = state\.currentView\)/);
  assert.match(app, /function requestViewSwitch\(name\)/);
  assert.match(app, /openUnsavedDialog\(\(\) => switchView\(name\), destination\)/);
  assert.match(app, /function requestLocaleChange\(locale\)/);
  assert.match(app, /window\.addEventListener\('beforeunload'/);
  assert.match(app, /emailView\?\.addEventListener\('input', trackEmailUnsaved\)/);
  assert.match(app, /storefrontCustomizer\?\.addEventListener\('input', trackStorefrontUnsaved\)/);
  assert.match(css, /\.unsaved-badge/);
  assert.match(css, /\.unsaved-changes-modal/);
});

test('v0.8.12 only clears dirty state after a successful save and supports save-or-discard navigation', async () => {
  const app = await read('../public/admin/app.js');
  assert.match(app, /captureSavedSettings\('setup'\)/);
  assert.match(app, /captureSavedSettings\('email'\)/);
  assert.match(app, /async function saveStorefrontSettings\(\{ silent = false \} = \{\}\)/);
  assert.match(app, /return true;[\s\S]*showError\(error\);[\s\S]*return false;/);
  assert.match(app, /discardUnsavedChanges\(view\)/);
  assert.match(app, /await saveEmailSettings\(\{ silent: true \}\)/);
  assert.match(app, /await saveStorefrontSettings\(\{ silent: true \}\)/);
});
