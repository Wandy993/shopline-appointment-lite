import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.1.2 service wizard keeps the availability intro target used by setBookingMode', async () => {
  const [view, admin] = await Promise.all([read('../src/views/admin.js'), read('../public/admin/app.js')]);
  assert.match(view, /id="availabilityIntro"/);
  assert.match(admin, /const availabilityIntro = \$\('#availabilityIntro'\);/);
  assert.match(admin, /if \(availabilityIntro\) availabilityIntro\.textContent/);
});

test('v0.8.1.2 admin assets and health release use a new cache build', async () => {
  const [view, app] = await Promise.all([read('../src/views/admin.js'), read('../src/app.js')]);
  assert.match(view, /build=[^\"&]+/);
  assert.match(app, /release:\s*'v\d+\.\d+\.\d+-[^']+'/);
});
