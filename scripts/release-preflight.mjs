import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const fail = message => failures.push(message);

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const lockRoot = packageLock.packages?.[''];
if (!lockRoot) {
  fail('package-lock.json must contain the root package entry');
} else {
  if (packageLock.version !== packageJson.version || lockRoot.version !== packageJson.version) {
    fail(`package-lock version must match package.json ${packageJson.version}`);
  }
  const dependencyGroups = ['dependencies', 'devDependencies', 'optionalDependencies'];
  for (const group of dependencyGroups) {
    const expected = packageJson[group] || {};
    const locked = lockRoot[group] || {};
    for (const [name, spec] of Object.entries(expected)) {
      if (locked[name] !== spec) fail(`package-lock root ${group}.${name} must equal package.json spec ${spec}`);
      if (!packageLock.packages?.[`node_modules/${name}`]) fail(`package-lock is missing node_modules/${name}`);
    }
  }
}

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

const themeCssFiles = [
  'theme-extension-source/public/appointment-lite.css',
  'theme-extension-source/public/appointment-lite-page.css',
  'theme-extension-source/public/appointment-lite-embed.css'
];
const themeFontCssRel = 'theme-extension-source/public/appointment-lite-fonts.css';
const themeFontCss = read(themeFontCssRel);
const themeFontSync = read('scripts/sync-theme-fonts.mjs');
const themeBlockFiles = [
  'theme-extension-source/blocks/appointment-lite.html',
  'theme-extension-source/blocks/appointment-lite-booking.html',
  'theme-extension-source/blocks/appointment-lite-staff-directory.html',
  'theme-extension-source/blocks/appointment-lite-embed.html'
];

for (const rel of themeCssFiles) {
  const css = read(rel);
  if (/al-(?:jost|poppins)-.*\.(?:woff2|woff|ttf|otf)|@font-face/i.test(css)) {
    fail(`${rel} must not ship standalone Theme Extension font binaries; typography comes from ${themeFontCssRel}`);
  }
}
for (const rel of themeBlockFiles) {
  const block = read(rel);
  if (!/public\/appointment-lite-fonts\.css/.test(block)) fail(`${rel} must load public/appointment-lite-fonts.css before its customer UI stylesheet`);
  const schemaText = block.match(/\{\{#schema\}\}\s*([\s\S]*?)\s*\{\{\/schema\}\}/)?.[1];
  try {
    const schema = JSON.parse(schemaText || '{}');
    const styles = Array.isArray(schema.stylesheet) ? schema.stylesheet : [];
    if (!styles.includes('public/appointment-lite-fonts.css')) fail(`${rel} schema must register public/appointment-lite-fonts.css`);
    if (styles.some(value => !String(value).endsWith('.css'))) fail(`${rel} stylesheet entries must all be CSS files`);
  } catch {
    fail(`${rel} schema must be valid JSON`);
  }
}
if (!/data:font\/woff2;base64,/.test(themeFontCss) || !/font-family:"Jost"/.test(themeFontCss) || !/font-family:"Poppins"/.test(themeFontCss)) {
  fail(`${themeFontCssRel} must contain generated embedded Jost/Poppins data-URL font faces`);
}
if (!/@fontsource\/jost\/files\/jost-latin-600-normal\.woff2/.test(themeFontSync) || !/@fontsource\/poppins\/files\/poppins-latin-400-normal\.woff2/.test(themeFontSync)) {
  fail('Theme font sync must embed the pinned @fontsource Jost/Poppins WOFF2 payloads into CSS');
}
if (!/data:font\/woff2;base64/.test(themeFontSync) || !/no standalone font binaries/i.test(themeFontSync)) {
  fail('Theme font sync must generate CSS data URLs and reject standalone Theme Extension font binaries');
}

const themePublicDir = path.join(root, 'theme-extension-source', 'public');
const allowedThemePublicExtensions = new Set(['.css', '.js', '.jpg', '.png', '.svg']);
for (const name of fs.readdirSync(themePublicDir)) {
  const ext = path.extname(name).toLowerCase();
  if (!allowedThemePublicExtensions.has(ext)) fail(`Theme Extension public asset ${name} uses unsupported extension ${ext || '(none)'}`);
}
const themeRoot = path.join(root, 'theme-extension-source');
let themeBytes = 0;
const accumulateSize = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) accumulateSize(full);
    else if (entry.isFile()) themeBytes += fs.statSync(full).size;
  }
};
accumulateSize(themeRoot);
if (themeBytes > 10 * 1024 * 1024) fail(`Theme Extension source exceeds the 10 MB upload limit (${themeBytes} bytes)`);

const legacyThemeTest = read('test/theme-extension.test.js');
const brittleSingleStylesheetAssertion = String.raw`assert.match(block, /"stylesheet": \["public\/appointment-lite\.css"\]/);`;
if (legacyThemeTest.includes(brittleSingleStylesheetAssertion)) {
  fail('theme-extension.test.js must validate Theme schema asset membership semantically instead of assuming one exact stylesheet array');
}

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
