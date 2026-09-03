import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function json(rel) {
  return JSON.parse(await readFile(new URL(`../${rel}`, import.meta.url), 'utf8'));
}

test('package-lock root metadata stays aligned with package.json', async () => {
  const pkg = await json('package.json');
  const lock = await json('package-lock.json');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages?.['']?.version, pkg.version);
  for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    assert.deepEqual(lock.packages?.['']?.[group] || {}, pkg[group] || {});
  }
});

test('every direct install dependency has a package-lock node entry', async () => {
  const pkg = await json('package.json');
  const lock = await json('package-lock.json');
  for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(pkg[group] || {})) {
      assert.ok(lock.packages?.[`node_modules/${name}`], `${name} is missing from package-lock.json`);
    }
  }
});
