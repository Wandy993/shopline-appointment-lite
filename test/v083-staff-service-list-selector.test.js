import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateStaffInput } from '../src/lib/validation.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.3 staff profile stores merchant-entered supported service labels', async () => {
  const [model, staffing, adminView, adminAsset] = await Promise.all([
    read('../src/models/Staff.js'),
    read('../src/services/staffing.js'),
    read('../src/views/admin.js'),
    read('../public/admin/app.js')
  ]);
  const result = validateStaffInput({
    name: 'Christine V.',
    supportedServices: ['Hair Color', ' Hair Cut ', 'Hair Color', 'Hair Styling'],
    weeklyAvailability: [{ weekday: 1, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }]
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.value.supportedServices, ['Hair Color', 'Hair Cut', 'Hair Styling']);
  assert.match(model, /supportedServices/);
  assert.match(staffing, /supportedServices: publicServiceList\(item\.supportedServices\)/);
  assert.match(adminView, /id="staffSupportedServices"/);
  assert.match(adminView, /Add one service per line/);
  assert.match(adminAsset, /supportedServices: \$\('#staffSupportedServices'\)/);
});

test('v0.8.3 product staff chooser matches avatar + services + Select list interaction', async () => {
  const [asset, css] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../theme-extension-source/public/appointment-lite.css')
  ]);
  assert.match(asset, /al-directory-person/);
  assert.match(asset, /al-directory-services-list/);
  assert.match(asset, /al-directory-check/);
  assert.match(asset, /Service details not added yet/);
  assert.match(asset, /<span>Select<\/span>/);
  assert.match(asset, /open\(widget, rule, context, \{ staffId \}\)/);
  assert.match(css, /grid-template-columns:minmax\(210px,.8fr\) minmax\(280px,1.25fr\) 90px/);
  assert.match(css, /\.al-directory-check\{/);
  assert.match(css, /border-radius:50%/);
});

test('v0.8.3 Staff Directory block uses the same supported-services list design', async () => {
  const [asset, css] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite-page.js'),
    read('../theme-extension-source/public/appointment-lite-page.css')
  ]);
  assert.match(asset, /supportedServices/);
  assert.match(asset, /al-dir-services-list/);
  assert.match(asset, /al-dir-check/);
  assert.match(asset, /al-dir-select/);
  assert.match(asset, />Select<\/span>/);
  assert.match(css, /grid-template-areas:"person services cta"/);
  assert.match(css, /\.al-dir-services-list/);
});
