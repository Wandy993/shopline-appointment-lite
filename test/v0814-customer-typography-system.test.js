import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.1.4 hosted booking and management pages use Jost headings and Poppins body text', async () => {
  const [bookCss, manageCss, bookView, manageView] = await Promise.all([
    read('../public/book/styles.css'), read('../public/manage/styles.css'), read('../src/views/book.js'), read('../src/views/manage.js')
  ]);
  assert.match(bookCss, /font-family:\"Poppins\",Arial,Helvetica,sans-serif/);
  assert.match(bookCss, /service-head h1[\s\S]*font-family:\"Jost\"/);
  assert.match(manageCss, /font-family:\"Poppins\",Arial,Helvetica,sans-serif/);
  assert.match(manageCss, /heading h1[\s\S]*font-family:\"Jost\"/);
  assert.doesNotMatch(bookView, /fonts\.googleapis\.com/);
  assert.match(bookView, /styles\.css\?v=0\.8\.1\.4/);
  assert.doesNotMatch(manageView, /fonts\.googleapis\.com/);
  assert.match(manageView, /styles\.css\?v=0\.8\.1\.4/);
});

test('v0.8.1.4 Theme customer surfaces use the same typography system', async () => {
  const [modalCss, pageCss, embedCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../theme-extension-source/public/appointment-lite-page.css'),
    read('../theme-extension-source/public/appointment-lite-embed.css')
  ]);
  for (const css of [modalCss, pageCss, embedCss]) {
    assert.doesNotMatch(css, /fonts\.googleapis\.com/);
    assert.match(css, /Poppins/);
    assert.match(css, /Jost/);
  }
  assert.match(modalCss, /\.al-dialog \.al-head h2[\s\S]*Jost/);
  assert.match(pageCss, /\.al-page-service h2,\.al-dir h2[\s\S]*Jost/);
  assert.match(embedCss, /\.al-embed-head strong[\s\S]*Jost/);
});

test('v0.8.1.4 transactional emails use Jost title and Poppins body with safe fallbacks', async () => {
  const [email, adminCss, adminView] = await Promise.all([read('../src/services/email.js'), read('../public/admin/styles.css'), read('../src/views/admin.js')]);
  assert.doesNotMatch(email, /fonts\.googleapis\.com/);
  assert.match(email, /customer-fonts\/jost/);
  assert.match(email, /font-family:'Poppins',Arial,Helvetica,sans-serif/);
  assert.match(email, /font-family:'Jost',Arial,Helvetica,sans-serif/);
  assert.match(adminCss, /email-preview[\s\S]*Poppins/);
  assert.match(adminCss, /preview-email-card h2[\s\S]*Jost/);
  assert.match(adminView, /build=0\.8\.1\.4/);
});

test('v0.8.1.4 CSP and release identity allow hosted web fonts', async () => {
  const [app, release] = await Promise.all([read('../src/app.js'), read('../scripts/build-release.sh')]);
  assert.match(app, /\/customer-fonts\/jost/);
  assert.match(app, /\/customer-fonts\/poppins/);
  assert.doesNotMatch(app, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(app, /build: '0\.8\.1\.[^']+'/);
  assert.match(app, /release: 'v0\.8\.1\.[^']+'/);
  assert.match(release, /RELEASE_LABEL="0\.8\.1\.[0-9.]+"/);
  assert.match(release, /RELEASE_BUILD="[^"]+"/);
});
