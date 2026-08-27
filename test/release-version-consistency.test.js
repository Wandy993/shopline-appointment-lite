import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('backend, package lock, admin, hosted booking, and Theme Extension cache keys match package version', async () => {
  const pkg = JSON.parse(await read('../package.json'));
  const lock = JSON.parse(await read('../package-lock.json'));
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages?.['']?.version, pkg.version);

  const version = pkg.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const [adminView, bookView, app, adminJs, bookJs, themeJs] = await Promise.all([
    read('../src/views/admin.js'),
    read('../src/views/book.js'),
    read('../src/app.js'),
    read('../public/admin/app.js'),
    read('../public/book/app.js'),
    read('../theme-extension-source/public/appointment-lite.js')
  ]);
  assert.match(adminView, new RegExp(`styles\\.css\\?v=${version}`));
  assert.match(adminView, new RegExp(`app\\.js\\?v=${version}`));
  assert.match(bookView, new RegExp(`styles\\.css\\?v=${version}`));
  assert.match(bookView, new RegExp(`app\\.js\\?v=${version}`));
  assert.match(app, new RegExp(`version: '${version}'`));
  assert.match(adminJs, new RegExp(`\\?v=${version}`));
  assert.match(bookJs, new RegExp(`\\?v=${version}`));
  assert.match(themeJs, new RegExp(`const VERSION = '${version}'`));
});
