import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.1.3.1 owns the current release identity without rewriting historical contract tests', async () => {
  const [app, view, release] = await Promise.all([
    read('../src/app.js'),
    read('../src/views/admin.js'),
    read('../scripts/build-release.sh')
  ]);
  assert.match(app, /build: '0\.8\.1\.3\.1-product-staff-directory-flow'/);
  assert.match(app, /release: 'v0\.8\.1\.3\.1-product-staff-directory-flow'/);
  assert.match(view, /styles\.css\?v=0\.8\.1&build=0\.8\.1\.3\.1/);
  assert.match(view, /app\.js\?v=0\.8\.1&build=0\.8\.1\.3\.1/);
  assert.match(release, /RELEASE_VERSION="0\.8\.1"/);
  assert.match(release, /RELEASE_LABEL="0\.8\.1\.3\.1"/);
  assert.match(release, /RELEASE_BUILD="product-staff-directory-flow\.1"/);
  assert.match(release, /appointment-lite-v\$\{RELEASE_LABEL\}-product-staff-directory-flow/);
});
