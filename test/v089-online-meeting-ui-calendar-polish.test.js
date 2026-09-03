import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('product-page booking receipt preserves confirmed meeting data for the inline manage dialog', async () => {
  const theme = await read('../theme-extension-source/public/appointment-lite.js');
  assert.match(theme, /meeting: booking\.meeting\?\.url \? \{/);
  assert.match(theme, /providerName: String\(booking\.meeting\.providerName/);
  assert.match(theme, /refreshManageReceipt\(context, rule, receipt\)/);
  assert.match(theme, /onlineMeetingAction\(receipt\.meeting, 'manage'\)/);
  assert.match(theme, /al-manage-meeting/);
});

test('Zoom customer actions keep provider branding across current customer surfaces', async () => {
  const [theme, hosted, manage, email] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../public/book/app.js'),
    read('../public/manage/app.js'),
    read('../src/services/email.js')
  ]);
  for (const source of [theme, hosted, manage]) {
    assert.match(source, /zoom-brand-svg|ZOOM_BRAND_SVG/);
  }
  assert.match(email, /meetingBrand/);
  assert.match(theme, /al-meeting-brand--zoom/);
  assert.match(hosted, /meeting-brand-icon--zoom/);
  assert.match(manage, /meeting-brand-icon--zoom/);
});

test('confirmation meeting and Google Calendar actions share the same compact secondary control language', async () => {
  const [themeCss, hostedCss, hostedView] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.css'),
    read('../public/book/styles.css'),
    read('../src/views/book.js')
  ]);
  assert.match(themeCss, /al-success-action/);
  assert.match(hostedCss, /success-action/);
  assert.match(hostedView, /id="meetingBrandIcon"/);
  assert.match(hostedView, /id="calendarMeetingNote"/);
});

test('online confirmation copy explains that the meeting URL is included in the Google Calendar event', async () => {
  const [theme, hosted] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../public/book/app.js')
  ]);
  assert.match(theme, /link included/);
  assert.match(hosted, /link included/);
  assert.match(hosted, /payload\.booking\.calendar\?\.google/);
});

test('cross-device manage page keeps the provider action branded without exposing it for inactive bookings', async () => {
  const [view, app, css] = await Promise.all([
    read('../src/views/manage.js'),
    read('../public/manage/app.js'),
    read('../public/manage/styles.css')
  ]);
  assert.match(view, /id="meetingBrandIcon"/);
  assert.match(app, /const meeting = active && booking\.meeting\?\.url \? booking\.meeting : null/);
  assert.match(app, /renderMeetingBrandIcon\(\$\('#meetingBrandIcon'\), meeting\)/);
  assert.match(css, /Zoom-branded compact join action/);
});
