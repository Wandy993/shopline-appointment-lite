import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.4 narrows the product-page staff selector without dropping list information', async () => {
  const [css, asset] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../theme-extension-source/public/appointment-lite.js')
  ]);
  assert.match(css, /\.al-staff-directory-dialog\{width:min\(820px,calc\(100vw - 40px\)\)/);
  assert.match(css, /grid-template-columns:minmax\(190px,.82fr\) minmax\(240px,1.18fr\) 78px/);
  assert.match(asset, /al-directory-person/);
  assert.match(asset, /al-directory-services/);
  assert.match(asset, /data-book-with-staff/);
});

test('v0.8.4 staff editor uses optional badges and removes the misleading Region field', async () => {
  const [view, css, app] = await Promise.all([
    read('../src/views/admin.js'),
    read('../public/admin/styles.css'),
    read('../public/admin/app.js')
  ]);
  assert.match(view, /class="optional-tag">optional<\/span>/);
  assert.match(css, /#staffDialog \.field label \.optional-tag/);
  assert.doesNotMatch(view, /id="staffRegion"/);
  assert.match(app, /roleTitle: \$\('#staffRoleTitle'\)\.value, region: '', expertise:/);
  assert.doesNotMatch(app, /\$\('#staffRegion'\)/);
});

test('v0.8.4 clarifies location ownership and keeps legacy staff region off public surfaces', async () => {
  const [view, staffing, theme] = await Promise.all([
    read('../src/views/admin.js'),
    read('../src/services/staffing.js'),
    read('../theme-extension-source/public/appointment-lite.js')
  ]);
  assert.match(view, /Location is configured per appointment service\./);
  assert.match(view, /SHOPLINE location, customer address, online service, or custom location/);
  assert.doesNotMatch(staffing, /region: publicProfileText\(item\.region\)/);
  assert.doesNotMatch(theme, /publicProfileValue\(item\.region\)/);
});
