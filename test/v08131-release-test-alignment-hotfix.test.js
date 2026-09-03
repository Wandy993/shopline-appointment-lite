import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.1.3.1 release-alignment hotfix remains covered without owning the active release number', async () => {
  const [app, view, release] = await Promise.all([
    read('../src/app.js'),
    read('../src/views/admin.js'),
    read('../scripts/build-release.sh')
  ]);
  assert.match(app, /version: '\d+\.\d+\.\d+'/);
  assert.match(app, /build: '[^']+'/);
  assert.match(app, /release: 'v[^']+'/);
  assert.match(view, /styles\.css\?v=\d+\.\d+\.\d+&build=[^\"&]+/);
  assert.match(view, /app\.js\?v=\d+\.\d+\.\d+&build=[^\"&]+/);
  assert.match(release, /RELEASE_VERSION="\d+\.\d+\.\d+"/);
  assert.match(release, /RELEASE_LABEL="[^"]+"/);
  assert.match(release, /RELEASE_BUILD="[^"]+"/);
  assert.match(release, /NAME="appointment-lite-v\$\{RELEASE_LABEL\}-[^"]+"/);
});
