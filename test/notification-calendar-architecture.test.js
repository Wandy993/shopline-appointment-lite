import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CalendarConnection } from '../src/models/CalendarConnection.js';
import { merchantNotificationRecipients, normalizeEmailSettings } from '../src/lib/email-settings.js';
import { buildBookingIcs, calendarLinksForBooking, googleCalendarAddUrl } from '../src/lib/calendar-links.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

function booking(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    productTitle: 'Home Service',
    bookingMode: 'slot',
    date: '2026-08-28',
    time: '14:00',
    duration: 60,
    timezone: 'Asia/Shanghai',
    location: 'Customer address',
    staff: 'Sarah',
    customer: { name: 'Jane Doe', email: 'jane@example.com' },
    status: 'confirmed',
    ...overrides
  };
}

test('merchant notification routing accepts QQ, 163, Gmail, Outlook and enterprise addresses without Google coupling', () => {
  const settings = normalizeEmailSettings({
    merchantNotificationEmail: 'owner@qq.com',
    additionalMerchantNotificationEmails: ['ops@163.com', 'team@gmail.com', 'calendar@outlook.com', 'service@example.cn']
  });
  assert.deepEqual(merchantNotificationRecipients(settings), [
    'owner@qq.com', 'ops@163.com', 'team@gmail.com', 'calendar@outlook.com', 'service@example.cn'
  ]);
});

test('customer calendar links are available without Google OAuth and multi-session falls back to ICS', () => {
  const single = booking();
  const links = calendarLinksForBooking(single);
  assert.match(links.google, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  assert.match(links.google, /ctz=Asia%2FShanghai/);
  assert.match(links.ics, /\/api\/public\/bookings\/507f1f77bcf86cd799439011\/calendar\.ics\?token=/);

  const multi = booking({
    bookingMode: 'multi_slot',
    occurrences: [
      { date: '2026-08-28', time: '14:00' },
      { date: '2026-09-04', time: '14:00' }
    ]
  });
  assert.equal(googleCalendarAddUrl(multi), '');
  const ics = buildBookingIcs(multi);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(ics, /DTSTART;TZID=Asia\/Shanghai:20260828T140000/);
  assert.match(ics, /DTSTART;TZID=Asia\/Shanghai:20260904T140000/);
});

test('Google customer guest invitations are opt-in and business calendar is a first-class connection type', () => {
  assert.equal(CalendarConnection.schema.path('sendCustomerInvites').options.default, false);
  assert.deepEqual(CalendarConnection.schema.path('connectionType').enumValues.sort(), ['business', 'staff']);
  const indexes = CalendarConnection.schema.indexes();
  assert.ok(indexes.some(([keys, options]) => keys.shopId === 1 && keys.provider === 1 && keys.connectionType === 1 && options.name === 'one_business_calendar_connection_per_provider'));
});

test('admin architecture separates merchant email, business calendar and optional personal staff calendars with no feature-tier gate', async () => {
  const [view, asset, routes, auth, shopModel, config, env] = await Promise.all([
    read('../src/views/admin.js'),
    read('../public/admin/app.js'),
    read('../src/routes/admin.js'),
    read('../src/routes/auth.js'),
    read('../src/models/Shop.js'),
    read('../src/config.js'),
    read('../.env.example')
  ]);
  assert.match(view, /Primary merchant inbox/);
  assert.match(view, /BUSINESS CALENDAR/);
  assert.match(view, /PERSONAL STAFF CALENDARS/);
  assert.match(asset, /Connect business Google Calendar/);
  assert.match(asset, /Add an email to notify this staff member without any Google account/);
  assert.match(routes, /\/calendar\/google\/store\/connect/);
  assert.match(routes, /merchantNotificationRecipients|validateEmailSettings/);
  assert.doesNotMatch(routes, /PLAN_LIMIT|limitsFor|planLimitsEnabled/);
  assert.doesNotMatch(auth, /defaultPlan/);
  assert.doesNotMatch(shopModel, /enum:\s*\['free',\s*'pro'\]/);
  assert.doesNotMatch(config, /PLAN_LIMITS_ENABLED|DEFAULT_PLAN|planLimitsEnabled|defaultPlan/);
  assert.doesNotMatch(env, /PLAN_LIMITS_ENABLED|DEFAULT_PLAN/);
});

test('storefront and email expose branded Add to Calendar instead of requiring Google attendee invitations', async () => {
  const [theme, hosted, bookView, emailService, db] = await Promise.all([
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../public/book/app.js'),
    read('../src/views/book.js'),
    read('../src/services/email.js'),
    read('../src/db.js')
  ]);
  assert.match(theme, /Add to Google Calendar/);
  assert.match(theme, /Apple \/ Outlook \/ Other \(\.ics\)/);
  assert.match(hosted, /payload\.booking\.calendar/);
  assert.match(bookView, /id="addGoogleCalendar"/);
  assert.match(emailService, /calendarButtons/);
  assert.match(db, /sendCustomerInvites:\s*false/);
});
