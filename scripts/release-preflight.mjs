import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const fail = message => failures.push(message);

const app = read('src/app.js');
const admin = read('src/views/admin.js');
const book = read('src/views/book.js');
const manage = read('src/views/manage.js');
const releaseScript = read('scripts/build-release.sh');

const health = app.match(/version: '([^']+)', build: '([^']+)', release: '([^']+)'/);
const releaseVersion = releaseScript.match(/RELEASE_VERSION="([^"]+)"/)?.[1] || '';
const releaseLabel = releaseScript.match(/RELEASE_LABEL="([^"]+)"/)?.[1] || '';
const releaseBuild = releaseScript.match(/RELEASE_BUILD="([^"]+)"/)?.[1] || '';
const releaseName = releaseScript.match(/NAME="([^"]+)"/)?.[1] || '';
const builderPreflightToStderr = /node \"\$ROOT_DIR\/scripts\/release-preflight\.mjs\" >\&2 \|\| exit 1/.test(releaseScript);

if (!builderPreflightToStderr) fail('release builder must reserve stdout for the final artifact path by sending preflight output to stderr');

if (!health) {
  fail('health release identity could not be parsed from src/app.js');
} else {
  const [, appVersion, appBuild, appRelease] = health;
  const releaseSlug = releaseBuild.replace(/\.\d+$/, '');
  const expectedBuild = `${releaseLabel}-${releaseSlug}`;
  const expectedName = `appointment-lite-v\${RELEASE_LABEL}-${releaseSlug}`;

  if (appVersion !== releaseVersion) fail(`health version ${appVersion} does not match RELEASE_VERSION ${releaseVersion}`);
  if (appBuild !== expectedBuild) fail(`health build ${appBuild} does not match ${expectedBuild}`);
  if (appRelease !== `v${expectedBuild}`) fail(`health release ${appRelease} does not match v${expectedBuild}`);
  if (releaseName !== expectedName) fail(`release NAME ${releaseName} does not match ${expectedName}`);

  const adminBuilds = [...admin.matchAll(/(?:styles\.css|app\.js)\?v=[^"&]+&build=([^"&]+)/g)].map(match => match[1]);
  if (adminBuilds.length < 2 || adminBuilds.some(value => value !== releaseLabel)) {
    fail(`admin asset build markers must all equal RELEASE_LABEL ${releaseLabel}; found ${adminBuilds.join(', ') || 'none'}`);
  }

  const hostedAssetVersions = [
    ...book.matchAll(/\/book\/assets\/(?:styles\.css|app\.js)\?v=([^"']+)/g),
    ...manage.matchAll(/\/manage\/assets\/(?:styles\.css|app\.js)\?v=([^"']+)/g)
  ].map(match => match[1]);
  if (hostedAssetVersions.length && hostedAssetVersions.some(value => value !== releaseLabel && value !== releaseVersion)) {
    fail(`hosted customer asset cache markers must use RELEASE_LABEL ${releaseLabel} or base version ${releaseVersion}; found ${hostedAssetVersions.join(', ')}`);
  }

  const escapeRegexLiteral = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\-/g, '-');
  const escapedCurrentBuild = escapeRegexLiteral(appBuild);
  const escapedCurrentRelease = escapeRegexLiteral(appRelease);
  const testDir = path.join(root, 'test');
  const offenders = [];
  for (const name of fs.readdirSync(testDir)) {
    if (!name.endsWith('.test.js') || name === 'release-contract.test.js') continue;
    const source = fs.readFileSync(path.join(testDir, name), 'utf8');
    if (source.includes(escapedCurrentBuild) || source.includes(escapedCurrentRelease)) offenders.push(name);
  }
  if (offenders.length) fail(`tests must not hard-code the current release identity: ${offenders.join(', ')}`);
}

if (failures.length) {
  failures.forEach(message => console.error(`release-preflight: ${message}`));
  process.exit(1);
}
console.log(`release-preflight: OK (${releaseLabel})`);
