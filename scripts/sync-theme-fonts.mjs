import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const themeDir = path.resolve(process.argv[2] || path.join(root, 'theme-app-extension'));
const publicDir = path.join(themeDir, 'public');

const files = [
  ['@fontsource/jost/files/jost-latin-500-normal.woff2', 'al-jost-500.woff2'],
  ['@fontsource/jost/files/jost-latin-600-normal.woff2', 'al-jost-600.woff2'],
  ['@fontsource/jost/files/jost-latin-700-normal.woff2', 'al-jost-700.woff2'],
  ['@fontsource/poppins/files/poppins-latin-400-normal.woff2', 'al-poppins-400.woff2'],
  ['@fontsource/poppins/files/poppins-latin-500-normal.woff2', 'al-poppins-500.woff2'],
  ['@fontsource/poppins/files/poppins-latin-600-normal.woff2', 'al-poppins-600.woff2'],
  ['@fontsource/poppins/files/poppins-latin-700-normal.woff2', 'al-poppins-700.woff2']
];

fs.mkdirSync(publicDir, { recursive: true });
for (const [modulePath, targetName] of files) {
  const source = path.join(root, 'node_modules', modulePath);
  const target = path.join(publicDir, targetName);
  if (!fs.existsSync(source)) {
    console.error(`customer-font-sync: missing ${source}`);
    console.error('Run npm install before syncing the Theme Extension.');
    process.exit(1);
  }
  fs.copyFileSync(source, target);
}

console.log(`customer-font-sync: OK (${files.length} local WOFF2 assets -> ${publicDir})`);
