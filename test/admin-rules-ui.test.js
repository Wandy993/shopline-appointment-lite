import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('product catalog binds clicks to rendered product option buttons', async () => {
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  assert.match(asset, /\$\$\('#productOptions \.product-option'\)\.forEach\(button => button\.addEventListener\('click'/);
  assert.doesNotMatch(asset, /\$\$\('\.select-option'\)\.forEach\(button => button\.addEventListener\('click', \(\) => selectProduct/);
});

test('service cards constrain long product titles and use appointment-rule copy', async () => {
  const asset = await readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8');
  assert.match(asset, /条预约规则/);
  assert.match(asset, /预约 \$\{rule\.duration\} 分钟/);
  assert.match(asset, /'无缓冲'/);
  assert.match(stylesheet, /\.service-card \{[^}]*min-width:0[^}]*overflow:hidden/);
  assert.match(stylesheet, /\.service-identity>div:last-child \{[^}]*min-width:0/);
  assert.match(stylesheet, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(stylesheet, /-webkit-line-clamp:2/);
});
