import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.8.11 email keeps provider and join action in one table row and themes providers', async () => {
  const email = await read('../src/services/email.js');
  assert.match(email, /<table role="presentation" width="100%"[^>]*><tr><td valign="middle"/);
  assert.match(email, /zoom: \{ accent: '#0B5CFF'/);
  assert.match(email, /google_meet: \{ accent: '#0F9D58'/);
  assert.match(email, /teams: \{ accent: '#5558AF'/);
  assert.match(email, /white-space:nowrap/);
});

test('v0.8.11 reduces Gmail-style repeated transactional threading by making the default confirmation subject appointment-specific', async () => {
  const email = await read('../src/services/email.js');
  assert.match(email, /key === 'confirmation'/);
  assert.match(email, /variables\.date/);
  assert.match(email, /variables\.time/);
});

test('v0.8.11 customer manage surfaces carry provider-aware theme classes', async () => {
  const [theme, themeCss, hostedCss, manage, manageCss] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../public/book/styles.css'),
    read('../public/manage/app.js'),
    read('../public/manage/styles.css')
  ]);
  assert.match(theme, /al-provider-/);
  assert.match(themeCss, /al-provider-zoom/);
  assert.match(themeCss, /al-provider-google_meet/);
  assert.match(themeCss, /al-provider-teams/);
  assert.match(hostedCss, /provider-zoom/);
  assert.match(hostedCss, /provider-google_meet/);
  assert.match(manage, /provider-\$\{meeting\.provider/);
  assert.match(manageCss, /provider-teams/);
});
