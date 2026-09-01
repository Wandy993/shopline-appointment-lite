import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { homePage, privacyPage, termsPage, faqPage } from '../src/views/legal.js';
import { GOOGLE_CALENDAR_SCOPES } from '../src/services/google-calendar.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

async function withServer(t) {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('v0.6.16 root is a public Google-verification-ready Appointment Lite homepage', async t => {
  const base = await withServer(t);
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') || '', /public/);
  const html = await response.text();
  assert.match(html, /Appointment Lite/);
  assert.match(html, /Connect SHOPLINE commerce with service scheduling/);
  assert.match(html, /Google Calendar/);
  assert.match(html, /\/en\/privacy/);
  assert.match(html, /\/en\/terms/);
  assert.match(html, /\/en\/faq/);
  assert.doesNotMatch(html, /Appointment Lite is running/);
  assert.doesNotMatch(html, /Open this app from SHOPLINE Admin/);
});

test('v0.6.16 keeps SHOPLINE install entry behavior on root query parameters', async t => {
  const base = await withServer(t);
  const response = await fetch(`${base}/?handle=merchant-demo&appkey=demo-key`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  const location = response.headers.get('location') || '';
  assert.match(location, /^\/auth\/install\?/);
  assert.match(location, /handle=merchant-demo/);
  assert.match(location, /appkey=demo-key/);
});

test('v0.6.16 exposes bilingual public terms and a Chinese product homepage', async t => {
  const base = await withServer(t);
  for (const route of ['/zh-cn', '/zh-cn/terms', '/en/terms']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    const html = await response.text();
    assert.match(html, /Appointment Lite/);
  }
  const zhTerms = await (await fetch(`${base}/zh-cn/terms`)).text();
  const enTerms = await (await fetch(`${base}/en/terms`)).text();
  assert.match(zhTerms, /服务条款/);
  assert.match(zhTerms, /Google Calendar/);
  assert.match(enTerms, /Terms of Service/);
  assert.match(enTerms, /SHOPLINE Products, Orders, and Payments/);
});

test('v0.6.16 terms shortcut follows browser language', async t => {
  const base = await withServer(t);
  const zh = await fetch(`${base}/terms`, { headers: { 'accept-language': 'zh-CN,zh;q=0.9' }, redirect: 'manual' });
  const en = await fetch(`${base}/terms`, { headers: { 'accept-language': 'en-US,en;q=0.9' }, redirect: 'manual' });
  assert.equal(zh.status, 302);
  assert.equal(en.status, 302);
  assert.equal(new URL(zh.headers.get('location'), base).pathname, '/zh-cn/terms');
  assert.equal(new URL(en.headers.get('location'), base).pathname, '/en/terms');
});

test('v0.6.16 public site exposes crawler metadata and linked legal navigation', async t => {
  const base = await withServer(t);
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  const sitemapResponse = await fetch(`${base}/sitemap.xml`);
  const sitemap = await sitemapResponse.text();
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Sitemap:/);
  assert.match(sitemapResponse.headers.get('content-type') || '', /xml/);
  assert.match(sitemap, /\/en\/privacy/);
  assert.match(sitemap, /\/en\/terms/);
  assert.match(sitemap, /\/zh-cn\/terms/);

  for (const html of [homePage('en'), privacyPage('en'), termsPage('en'), faqPage('en')]) {
    assert.match(html, />Home</);
    assert.match(html, />Privacy</);
    assert.match(html, />Terms</);
    assert.match(html, />FAQ</);
    assert.match(html, /hreflang="x-default"/);
  }
});

test('v0.6.16 homepage accurately describes current owned-calendar scope behavior', () => {
  assert.deepEqual(GOOGLE_CALENDAR_SCOPES, [
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    'https://www.googleapis.com/auth/calendar.events.owned'
  ]);
  const html = homePage('en');
  assert.match(html, /reads the list of calendars owned by the account/i);
  assert.match(html, /creates, updates, or deletes appointment events on the selected owned calendar/i);
  assert.doesNotMatch(html, /read all calendar events/i);
});

test('v0.6.16 release documentation lists the production Google Auth Platform values', async () => {
  const [doc, env, app, pkg, adminView, bookView, theme, release] = await Promise.all([
    source('docs/V0613_GOOGLE_OAUTH_VERIFICATION_READINESS.md'),
    source('.env.example'),
    source('src/app.js'),
    source('package.json'),
    source('src/views/admin.js'),
    source('src/views/book.js'),
    source('theme-extension-source/public/appointment-lite.js'),
    source('scripts/build-release.sh')
  ]);
  assert.match(doc, /https:\/\/appointment\.toolkit\.fans\//);
  assert.match(doc, /Authorized domain: `toolkit\.fans`/);
  assert.match(doc, /https:\/\/appointment\.toolkit\.fans\/integrations\/google\/callback/);
  assert.match(doc, /calendar\.calendarlist\.readonly/);
  assert.match(doc, /calendar\.events\.owned/);
  assert.match(env, /Homepage: https:\/\/appointment\.toolkit\.fans\//);
  assert.match(env, /Authorized domain: toolkit\.fans/);
  assert.equal(JSON.parse(pkg).version, '0.8.1');
  assert.match(app, /version: '0.8.1'/);
  assert.match(adminView, /styles\.css\?v=0.8.1/);
  assert.match(bookView, /styles\.css\?v=0.8.1/);
  assert.match(theme, /const VERSION = '0.8.1'/);
  assert.match(release, /RELEASE_VERSION="0.8.1"/);
  assert.match(release, /booking-model-storefront-placement/);
});
