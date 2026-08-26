import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CalendarConnection } from '../src/models/CalendarConnection.js';
import { merchantNotificationRecipients, normalizeEmailSettings } from '../src/lib/email-settings.js';
import { buildBookingIcs, calendarLinksForBooking } from '../src/lib/calendar-links.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

function booking(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011', productTitle: 'Home Service', bookingMode: 'slot',
    date: '2026-08-28', time: '14:00', duration: 60, timezone: 'Asia/Shanghai', location: 'Customer address',
    staff: 'Sarah', customer: { name: 'Jane Doe', email: 'jane@example.com' }, status: 'confirmed', ...overrides
  };
}

test('merchant and staff email notifications remain independent of Google accounts', () => {
  const settings = normalizeEmailSettings({ merchantNotificationEmail: 'owner@qq.com', additionalMerchantNotificationEmails: ['ops@163.com','team@gmail.com','calendar@outlook.com','service@example.cn'] });
  assert.deepEqual(merchantNotificationRecipients(settings), ['owner@qq.com','ops@163.com','team@gmail.com','calendar@outlook.com','service@example.cn']);
});

test('calendar helper keeps ICS compatibility internally while merchant-facing UX can prefer Google', () => {
  const links = calendarLinksForBooking(booking());
  assert.match(links.google, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  assert.match(links.ics, /calendar\.ics\?token=/);
  assert.match(buildBookingIcs(booking()), /BEGIN:VEVENT/);
});

test('business calendar is a first-class connection and customer guest invitations stay off by default', () => {
  assert.equal(CalendarConnection.schema.path('sendCustomerInvites').options.default, false);
  assert.deepEqual(CalendarConnection.schema.path('connectionType').enumValues.sort(), ['business','staff']);
  assert.ok(CalendarConnection.schema.indexes().some(([keys, options]) => keys.shopId === 1 && keys.provider === 1 && keys.connectionType === 1 && options.name === 'one_business_calendar_connection_per_provider'));
});

test('Calendar Sync exposes only one merchant Business Google Calendar with no feature-tier gate or technical implementation copy', async () => {
  const [view, asset, routes, auth, shopModel, config, env] = await Promise.all([
    read('../src/views/admin.js'), read('../public/admin/app.js'), read('../src/routes/admin.js'), read('../src/routes/auth.js'), read('../src/models/Shop.js'), read('../src/config.js'), read('../.env.example')
  ]);
  assert.match(view, /Business appointment calendar/);
  assert.match(view, /Staff do not need to connect Google/);
  assert.doesNotMatch(view, /PERSONAL STAFF CALENDARS|Connect personal Google Calendar|calendar\.events\.owned|Redirect URI|OAuth Ready|Railway/);
  assert.match(asset, /googleGMark/);
  assert.doesNotMatch(asset, /data-calendar-setting="syncAppointments"|data-calendar-setting="sendCustomerInvites"|Connect personal Google Calendar/);
  assert.match(routes, /mode:\s*'business_calendar'/);
  assert.match(routes, /STAFF_GOOGLE_CALENDAR_RETIRED/);
  assert.doesNotMatch(routes, /PLAN_LIMIT|limitsFor|planLimitsEnabled/);
  assert.doesNotMatch(auth, /defaultPlan/);
  assert.doesNotMatch(shopModel, /enum:\s*\['free',\s*'pro'\]/);
  assert.doesNotMatch(config, /PLAN_LIMITS_ENABLED|DEFAULT_PLAN|planLimitsEnabled|defaultPlan/);
  assert.doesNotMatch(env, /PLAN_LIMITS_ENABLED|DEFAULT_PLAN/);
});

test('customer surfaces offer one clean Google Calendar action and no direct ICS download button', async () => {
  const [theme, hosted, bookView, emailService] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'), read('../public/book/app.js'), read('../src/views/book.js'), read('../src/services/email.js')
  ]);
  assert.match(theme, /GOOGLE_G_ICON/);
  assert.match(theme, /Add to Google Calendar/);
  assert.doesNotMatch(theme, /Apple \/ Outlook|\.ics<\/a>/);
  assert.doesNotMatch(hosted, /downloadCalendarIcs/);
  assert.match(bookView, /google-g-icon/);
  assert.doesNotMatch(bookView, /Apple \/ Outlook|downloadCalendarIcs/);
  assert.match(emailService, /Add to Google Calendar/);
  assert.doesNotMatch(emailService, /Apple \/ Outlook \/ Other/);
});

test('Calendar Sync merchant copy has Chinese translations and standard multicolor Google G paths', async () => {
  const [asset, view] = await Promise.all([read('../public/admin/app.js'), read('../src/views/admin.js')]);
  assert.match(asset, /'Staff do not need to connect Google': '员工无需连接 Google'/);
  assert.match(asset, /'Manage staff emails': '管理员工邮箱'/);
  assert.match(asset, /#4285F4/); assert.match(asset, /#34A853/); assert.match(asset, /#FBBC05/); assert.match(asset, /#EA4335/);
  assert.match(view, /#4285F4/); assert.match(view, /#34A853/);
});
