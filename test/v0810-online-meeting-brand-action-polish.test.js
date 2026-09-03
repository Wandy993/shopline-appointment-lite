import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

const ZOOM_PATH_FRAGMENT = 'M5.033 14.649H.743';

test('v0.8.10 customer surfaces render Zoom with self-contained inline SVG instead of a third-party runtime image', async () => {
  const [theme, hosted, manage, email] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../public/book/app.js'),
    read('../public/manage/app.js'),
    read('../src/services/email.js')
  ]);
  for (const source of [theme, hosted, manage]) {
    assert.match(source, new RegExp(ZOOM_PATH_FRAGMENT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(source, /zoom-brand-svg/);
    assert.doesNotMatch(source, /media\.zoom\.com\/images\/assets\/zoom-logo-2025\.png/);
  }
  assert.doesNotMatch(email, /media\.zoom\.com\/images\/assets\/zoom-logo-2025\.png/);
  assert.match(email, />zoom<\/span>/);
});

test('v0.8.10 product confirmation groups meeting and Google Calendar into one responsive Next steps panel', async () => {
  const [theme, css] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../theme-extension-source/public/appointment-lite.css')
  ]);
  assert.match(theme, /al-success-next-steps/);
  assert.match(theme, /al-success-action-grid/);
  assert.match(theme, /al-success-action--meeting/);
  assert.match(theme, /al-success-action--calendar/);
  assert.match(theme, /<small>Calendar<\/small><strong[^>]*>Add to Google Calendar<\/strong>/);
  assert.match(theme, /link included<\/em>/);
  assert.match(css, /grid-template-columns:repeat\(auto-fit,minmax\(190px,1fr\)\)/);
  assert.match(css, /@media\(max-width:520px\)/);
});

test('v0.8.10 hosted confirmation uses the same Next steps action-card hierarchy', async () => {
  const [view, app, css] = await Promise.all([
    read('../src/views/book.js'),
    read('../public/book/app.js'),
    read('../public/book/styles.css')
  ]);
  assert.match(view, /id="successNextSteps" class="success-next-steps hidden"/);
  assert.match(view, /class="success-action meeting-link"/);
  assert.match(view, /class="success-action calendar-link google-calendar-link hidden"/);
  assert.match(app, /successNextSteps/);
  assert.match(css, /\.success-action-grid\{display:grid/);
});

test('v0.8.10 keeps calendar semantics explicit: calendar action carries the existing meeting link rather than creating another meeting', async () => {
  const [theme, hosted, calendar] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../public/book/app.js'),
    read('../src/lib/calendar-links.js')
  ]);
  assert.match(theme, /link included/);
  assert.match(hosted, /link included/);
  assert.match(calendar, /onlineMeeting/);
  assert.doesNotMatch(theme, /create.*zoom|create.*meeting/i);
});
