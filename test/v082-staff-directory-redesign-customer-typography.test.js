import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.2 Staff Directory established the full-width single-column profile baseline', async () => {
  const [asset, css, pageAsset, pageCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../theme-extension-source/public/appointment-lite-page.js'),
    read('../theme-extension-source/public/appointment-lite-page.css')
  ]);
  assert.match(asset, /openStaffDirectory\(widget, rule, context, staff\)/);
  assert.match(asset, /al-directory-grid/);
  assert.match(css, /\.al-directory-grid\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.al-staff-directory-dialog/);
  assert.match(pageAsset, /al-dir-grid/);
  assert.match(pageCss, /\.al-dir-grid/);
});

test('v0.8.2 public staff profiles suppress placeholder fields and keep contact data private', async () => {
  const [staffing, route] = await Promise.all([read('../src/services/staffing.js'), read('../src/routes/public.js')]);
  assert.match(staffing, /function publicProfileText/);
  assert.match(staffing, /select\|choose/);
  assert.doesNotMatch(staffing, /region: publicProfileText\(item\.region\)/);
  assert.match(staffing, /expertise: publicProfileText\(item\.expertise\)/);
  assert.match(staffing, /bio: publicProfileText\(item\.bio\)/);
  assert.doesNotMatch(staffing, /email: item\.email[\s\S]*publicStaffDirectory/);
  assert.match(route, /publicStaffDirectory\(result\.rule\)/);
});

test('v0.8.2 customer surfaces enforce Jost headings and Poppins body with CJK-safe fallbacks', async () => {
  const [modalCss, pageCss, embedCss, bookCss, manageCss, email] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../theme-extension-source/public/appointment-lite-page.css'),
    read('../theme-extension-source/public/appointment-lite-embed.css'),
    read('../public/book/styles.css'),
    read('../public/manage/styles.css'),
    read('../src/services/email.js')
  ]);
  for (const css of [modalCss, pageCss, embedCss, bookCss, manageCss]) {
    assert.match(css, /"Jost","Poppins","PingFang SC","Hiragino Sans GB","Microsoft YaHei"/);
    assert.match(css, /"Poppins","PingFang SC","Hiragino Sans GB","Microsoft YaHei"/);
    assert.match(css, /!important/);
  }
  assert.match(email, /'Jost','Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei'/);
  assert.match(email, /'Poppins','PingFang SC','Hiragino Sans GB','Microsoft YaHei'/);
});

test('active release uses a real SemVer package version and current cache markers', async () => {
  const [pkgText, app, admin, book, manage, theme, page, embed, release] = await Promise.all([
    read('../package.json'), read('../src/app.js'), read('../src/views/admin.js'), read('../src/views/book.js'), read('../src/views/manage.js'),
    read('../theme-extension-source/public/appointment-lite.js'), read('../theme-extension-source/public/appointment-lite-page.js'), read('../theme-extension-source/public/appointment-lite-embed.js'), read('../scripts/build-release.sh')
  ]);
  const pkg = JSON.parse(pkgText);
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  const escaped = pkg.version.replace(/\./g, '\\.');
  assert.match(app, new RegExp(`version: '${escaped}'`));
  assert.match(admin, new RegExp(`styles\\.css\\?v=${escaped}&build=${escaped}`));
  assert.match(book, new RegExp(`styles\\.css\\?v=${escaped}`));
  assert.match(manage, new RegExp(`styles\\.css\\?v=${escaped}`));
  for (const asset of [theme, page, embed]) assert.match(asset, new RegExp(`const VERSION = '${escaped}'`));
  assert.match(release, new RegExp(`RELEASE_VERSION=\"${escaped}\"`));
  assert.match(release, new RegExp(`RELEASE_LABEL=\"${escaped}\"`));
});
