import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { faqPage, privacyPage, preferredLegalLocale } from '../src/views/legal.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

test('v0.6.10 exposes public bilingual privacy and FAQ pages without admin auth', async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  for (const route of ['/zh-cn/privacy', '/en/privacy', '/zh-cn/faq', '/en/faq']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.match(response.headers.get('cache-control') || '', /public/);
    const html = await response.text();
    assert.match(html, /Appointment Lite/);
    assert.doesNotMatch(html, /Open this app from SHOPLINE Admin/);
  }
});

test('v0.6.10 privacy and FAQ shortcut routes redirect by browser language', async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const zh = await fetch(`${base}/privacy`, { headers: { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' }, redirect: 'manual' });
  assert.equal(zh.status, 302);
  assert.equal(new URL(zh.headers.get('location'), base).pathname, '/zh-cn/privacy');

  const en = await fetch(`${base}/faq`, { headers: { 'accept-language': 'en-US,en;q=0.9' }, redirect: 'manual' });
  assert.equal(en.status, 302);
  assert.equal(new URL(en.headers.get('location'), base).pathname, '/en/faq');
});

test('v0.6.10 FAQ ships the complete 45-question knowledge base in both languages', () => {
  const zh = faqPage('zh-cn');
  const en = faqPage('en');
  assert.equal((zh.match(/data-faq-item/g) || []).length, 45);
  assert.equal((en.match(/data-faq-item/g) || []).length, 45);
  assert.match(zh, /搜索问题/);
  assert.match(en, /Search questions/);
  assert.match(zh, /Google Calendar/);
  assert.match(en, /post-purchase scheduling/i);
});

test('v0.6.10 legal pages expose privacy coverage, language navigation, and searchable accordion assets', async () => {
  const [zhPrivacy, enPrivacy, app, faqJs, css] = await Promise.all([
    Promise.resolve(privacyPage('zh-cn')),
    Promise.resolve(privacyPage('en')),
    source('src/app.js'),
    source('public/legal/faq.js'),
    source('public/legal/styles.css')
  ]);
  assert.match(zhPrivacy, /SHOPLINE 订单信息/);
  assert.match(zhPrivacy, /Google Calendar 信息/);
  assert.match(zhPrivacy, /应用卸载/);
  assert.match(enPrivacy, /SHOPLINE Order Information/);
  assert.match(enPrivacy, /Google Calendar Information/);
  assert.match(enPrivacy, /App Uninstallation/);
  assert.match(app, /\/zh-cn\/privacy/);
  assert.match(app, /\/en\/faq/);
  assert.match(faqJs, /data-faq-search/);
  assert.match(css, /\.faq-item\[open\]/);
});

test('v0.6.10 language helper keeps Chinese variants on the Chinese legal pages', () => {
  assert.equal(preferredLegalLocale('zh-CN,zh;q=0.9'), 'zh-cn');
  assert.equal(preferredLegalLocale('zh-TW,en;q=0.8'), 'zh-cn');
  assert.equal(preferredLegalLocale('en-US,en;q=0.9'), 'en');
  assert.equal(preferredLegalLocale(''), 'en');
});

test('v0.6.10 release version and legal page cache markers stay aligned', async () => {
  const [pkgText, app, adminView, bookView, theme, release] = await Promise.all([
    source('package.json'), source('src/app.js'), source('src/views/admin.js'), source('src/views/book.js'), source('theme-extension-source/public/appointment-lite.js'), source('scripts/build-release.sh')
  ]);
  assert.equal(JSON.parse(pkgText).version, '0.8.1');
  assert.match(app, /version: '0.8.1'/);
  assert.match(adminView, /styles\.css\?v=0.8.1/);
  assert.match(bookView, /styles\.css\?v=0.8.1/);
  assert.match(theme, /const VERSION = '0.8.1'/);
  assert.match(release, /RELEASE_VERSION="0.8.1"/);
  assert.match(release, /service-wizard-simplification-ui-polish/);
});
