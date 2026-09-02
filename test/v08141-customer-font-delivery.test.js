import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.1.4.1 self-hosts hosted customer fonts instead of depending on Google Fonts', async () => {
  const [app, bookCss, manageCss, adminCss, bookView, manageView, email] = await Promise.all([
    read('../src/app.js'), read('../public/book/styles.css'), read('../public/manage/styles.css'), read('../public/admin/styles.css'),
    read('../src/views/book.js'), read('../src/views/manage.js'), read('../src/services/email.js')
  ]);
  assert.match(app, /\/customer-fonts\/jost/);
  assert.match(app, /\/customer-fonts\/poppins/);
  assert.doesNotMatch(app, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  for (const css of [bookCss, manageCss, adminCss]) {
    assert.match(css, /@font-face\{font-family:"Jost"/);
    assert.match(css, /@font-face\{font-family:"Poppins"/);
    assert.match(css, /\/customer-fonts\/jost/);
    assert.match(css, /\/customer-fonts\/poppins/);
    assert.doesNotMatch(css, /fonts\.googleapis\.com/);
  }
  assert.doesNotMatch(bookView, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(manageView, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(email, /customer-fonts\/jost/);
  assert.match(email, /customer-fonts\/poppins/);
  assert.doesNotMatch(email, /fonts\.googleapis\.com/);
});

test('v0.8.1.4.1 Theme Extension uses packaged local WOFF2 assets and a reusable sync step', async () => {
  const [modalCss, pageCss, embedCss, syncScript, pkg] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../theme-extension-source/public/appointment-lite-page.css'),
    read('../theme-extension-source/public/appointment-lite-embed.css'),
    read('../scripts/sync-theme-fonts.mjs'),
    read('../package.json')
  ]);
  for (const css of [modalCss, pageCss, embedCss]) {
    assert.match(css, /\.\/al-jost-600\.woff2/);
    assert.match(css, /\.\/al-poppins-400\.woff2/);
    assert.doesNotMatch(css, /fonts\.googleapis\.com/);
  }
  assert.match(syncScript, /jost-latin-600-normal\.woff2/);
  assert.match(syncScript, /poppins-latin-400-normal\.woff2/);
  assert.match(pkg, /"@fontsource\/jost": "5\.3\.0"/);
  assert.match(pkg, /"@fontsource\/poppins": "5\.3\.0"/);
});
