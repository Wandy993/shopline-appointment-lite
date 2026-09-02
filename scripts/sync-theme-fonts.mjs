import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceOnly = process.argv.includes('--source-only');
const themeArg = process.argv.slice(2).find(value => value !== '--source-only');
const themeDir = path.resolve(themeArg || path.join(root, 'theme-app-extension'));
const sourcePublicDir = path.join(root, 'theme-extension-source', 'public');
const themePublicDir = path.join(themeDir, 'public');
const outputDirs = sourceOnly ? [sourcePublicDir] : [sourcePublicDir, themePublicDir];
const outputName = 'appointment-lite-fonts.css';

// Theme App Extension upload validation accepts CSS/JS/image assets, but rejects
// standalone font binaries. Keep customer typography fully local by embedding the
// pinned latin WOFF2 payloads as data URLs inside one normal CSS asset.
const fonts = [
  { family: 'Jost', weight: 600, rel: '@fontsource/jost/files/jost-latin-600-normal.woff2' },
  { family: 'Poppins', weight: 400, rel: '@fontsource/poppins/files/poppins-latin-400-normal.woff2' },
  { family: 'Poppins', weight: 500, rel: '@fontsource/poppins/files/poppins-latin-500-normal.woff2' },
  { family: 'Poppins', weight: 600, rel: '@fontsource/poppins/files/poppins-latin-600-normal.woff2' },
  { family: 'Poppins', weight: 700, rel: '@fontsource/poppins/files/poppins-latin-700-normal.woff2' }
];

for (const dir of outputDirs) {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir)) {
    if (/^al-(?:jost|poppins)-.*\.(?:woff2|woff|ttf|otf)$/i.test(name)) fs.rmSync(path.join(dir, name), { force: true });
  }
}

const faces = fonts.map(({ family, weight, rel }) => {
  const source = path.join(root, 'node_modules', rel);
  if (!fs.existsSync(source)) {
    console.error(`customer-font-sync: missing ${source}`);
    console.error('Run npm install before syncing the Theme Extension.');
    process.exit(1);
  }
  const encoded = fs.readFileSync(source).toString('base64');
  return `@font-face{font-family:"${family}";font-style:normal;font-display:swap;font-weight:${weight};src:url("data:font/woff2;base64,${encoded}") format("woff2")}`;
});

const css = `/* Appointment Lite customer fonts. Generated; do not hand edit. */\n${faces.join('\n')}\n`;
if (Buffer.byteLength(css) > 1024 * 1024) {
  console.error(`customer-font-sync: generated CSS is unexpectedly large (${Buffer.byteLength(css)} bytes)`);
  process.exit(1);
}
for (const dir of outputDirs) fs.writeFileSync(path.join(dir, outputName), css);

for (const dir of outputDirs) {
  const binaries = fs.readdirSync(dir).filter(name => /\.(?:woff2|woff|ttf|otf)$/i.test(name));
  if (binaries.length) {
    console.error(`customer-font-sync: Theme Extension public directory contains unsupported font binaries: ${binaries.join(', ')}`);
    process.exit(1);
  }
}
console.log(`customer-font-sync: OK (${fonts.length} fonts embedded in ${outputName}; no standalone font binaries${sourceOnly ? '; source-only' : ''})`);
