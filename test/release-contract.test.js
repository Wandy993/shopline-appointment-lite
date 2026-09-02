import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

function parseRelease(app, shell) {
  const health = app.match(/version: '([^']+)', build: '([^']+)', release: '([^']+)'/);
  assert.ok(health, 'health release identity should be parseable');
  const releaseVersion = shell.match(/RELEASE_VERSION="([^"]+)"/)?.[1];
  const releaseLabel = shell.match(/RELEASE_LABEL="([^"]+)"/)?.[1];
  const releaseBuild = shell.match(/RELEASE_BUILD="([^"]+)"/)?.[1];
  const releaseName = shell.match(/NAME="([^"]+)"/)?.[1];
  assert.ok(releaseVersion && releaseLabel && releaseBuild && releaseName, 'release builder metadata should be parseable');
  return { health, releaseVersion, releaseLabel, releaseBuild, releaseName };
}

test('current release identity stays aligned without version-specific historical assertions', async () => {
  const [app, admin, book, manage, shell] = await Promise.all([
    read('../src/app.js'), read('../src/views/admin.js'), read('../src/views/book.js'), read('../src/views/manage.js'), read('../scripts/build-release.sh')
  ]);
  const { health, releaseVersion, releaseLabel, releaseBuild, releaseName } = parseRelease(app, shell);
  const [, appVersion, appBuild, appRelease] = health;
  const slug = releaseBuild.replace(/\.\d+$/, '');
  const expectedBuild = `${releaseLabel}-${slug}`;

  assert.equal(appVersion, releaseVersion);
  assert.equal(appBuild, expectedBuild);
  assert.equal(appRelease, `v${expectedBuild}`);
  assert.equal(releaseName, `appointment-lite-v\${RELEASE_LABEL}-${slug}`);

  const adminBuilds = [...admin.matchAll(/(?:styles\.css|app\.js)\?v=[^"&]+&build=([^"&]+)/g)].map(match => match[1]);
  assert.ok(adminBuilds.length >= 2);
  assert.ok(adminBuilds.every(value => value === releaseLabel));

  const hostedVersions = [
    ...book.matchAll(/\/book\/assets\/(?:styles\.css|app\.js)\?v=([^"']+)/g),
    ...manage.matchAll(/\/manage\/assets\/(?:styles\.css|app\.js)\?v=([^"']+)/g)
  ].map(match => match[1]);
  assert.ok(hostedVersions.every(value => value === releaseLabel || value === releaseVersion));
});

test('historical tests cannot hard-code the active release identity', async () => {
  const [app, shell, names] = await Promise.all([
    read('../src/app.js'), read('../scripts/build-release.sh'), readdir(new URL('./', import.meta.url))
  ]);
  const { health } = parseRelease(app, shell);
  const appBuild = health[2];
  const appRelease = health[3];
  const escapeRegexLiteral = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\-/g, '-');
  const escapedBuild = escapeRegexLiteral(appBuild);
  const escapedRelease = escapeRegexLiteral(appRelease);
  const offenders = [];

  for (const name of names) {
    if (!name.endsWith('.test.js') || name === 'release-contract.test.js') continue;
    const source = await read(`./${name}`);
    if (source.includes(escapedBuild) || source.includes(escapedRelease)) offenders.push(name);
  }
  assert.deepEqual(offenders, []);
});

test('release builder reserves stdout for exactly one artifact path', async () => {
  const shell = await read('../scripts/build-release.sh');
  assert.match(shell, /node "\$ROOT_DIR\/scripts\/release-preflight\.mjs" >&2 \|\| exit 1/);
  assert.match(shell, /printf '%s\\n' "\$OUTPUT"/);
});
