import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
for (const [source, destination] of [
  ['node_modules/@fontsource/jost/files', 'public/customer-fonts/jost'],
  ['node_modules/@fontsource/poppins/files', 'public/customer-fonts/poppins']
]) {
  await mkdir(resolve(root, destination), { recursive: true });
  await cp(resolve(root, source), resolve(root, destination), { recursive: true });
}
console.log('Cloudflare static assets prepared.');
