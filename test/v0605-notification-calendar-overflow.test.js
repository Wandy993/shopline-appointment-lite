import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_EMAIL_SETTINGS, normalizeEmailSettings } from '../src/lib/email-settings.js';
import { reminderIsDue, reminderOccurrences, wallTimeToInstant } from '../src/lib/reminder-time.js';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('v0.6.0.5 gives merchants customer and merchant notification controls with reminder timing', () => {
  const defaults = normalizeEmailSettings({});
  assert.equal(defaults.reminderLeadHours, 24);
  assert.equal(defaults.customerNotifications.confirmation, true);
  assert.equal(defaults.customerNotifications.upcomingReminder, true);
  assert.equal(defaults.merchantNotifications.upcomingReminder, true);
  assert.ok(DEFAULT_EMAIL_SETTINGS.templates.reminder);
  assert.ok(DEFAULT_EMAIL_SETTINGS.templates.merchantReminder);
  const custom = normalizeEmailSettings({ reminderLeadHours: 12, customerNotifications: { confirmation: false, upcomingReminder: false }, merchantNotifications: { upcomingReminder: false } });
  assert.equal(custom.reminderLeadHours, 12);
  assert.equal(custom.customerNotifications.confirmation, false);
  assert.equal(custom.customerNotifications.upcomingReminder, false);
  assert.equal(custom.merchantNotifications.upcomingReminder, false);
});

test('pre-appointment reminder timing respects the booking timezone and multi-session occurrences', () => {
  const start = wallTimeToInstant('2026-08-28', '14:00', 'Asia/Shanghai');
  assert.equal(start.toISOString(), '2026-08-28T06:00:00.000Z');
  assert.equal(reminderIsDue(start, 24, new Date('2026-08-27T06:00:00.000Z')), true);
  assert.equal(reminderIsDue(start, 24, new Date('2026-08-27T05:59:00.000Z')), false);
  assert.deepEqual(reminderOccurrences({ bookingMode:'multi_slot', occurrences:[{date:'2026-08-28',time:'14:00',slotKey:'a'},{date:'2026-09-04',time:'14:00',slotKey:'b'}] }).map(item=>item.occurrenceKey), ['a','b']);
});

test('calendar overflow, staff i18n, reminder delivery model, and scheduler wiring are present', async () => {
  const [admin, view, styles, shop, reminderModel, reminders, server, email] = await Promise.all([
    read('../public/admin/app.js'), read('../src/views/admin.js'), read('../public/admin/styles.css'), read('../src/models/Shop.js'),
    read('../src/models/EmailReminderDelivery.js'), read('../src/services/reminders.js'), read('../src/server.js'), read('../src/services/email.js')
  ]);
  assert.match(admin, /data-calendar-more/); assert.match(admin, /openCalendarDay/); assert.match(view, /calendarDayDialog/); assert.match(styles, /\.calendar-day-booking/);
  assert.match(admin, /'Built-in portrait or custom image': '内置头像或自定义图片'/);
  assert.match(admin, /'Choose a built-in staff portrait, upload a photo, or use initials\. Custom images are resized in your browser before saving\.': '选择内置员工头像、上传照片或使用姓名首字母。自定义图片会在浏览器中压缩后保存。'/);
  for (const id of ['customerNotifyConfirmation','customerNotifyChanged','customerNotifyCancelled','customerNotifyReminder','merchantNotifyReminder','emailReminderLeadHours']) assert.match(view, new RegExp(id));
  assert.match(shop, /customerNotifications/); assert.match(shop, /upcomingReminder/); assert.match(shop, /merchantReminder/);
  assert.match(reminderModel, /one_email_reminder_per_occurrence_audience/); assert.match(reminders, /setInterval\(run,RUN_INTERVAL_MS\)/); assert.match(server, /startReminderScheduler/);
  assert.match(email, /sendCustomerUpcomingReminder/); assert.match(email, /sendMerchantUpcomingReminder/);
});

test('optional confirmation email no longer makes the storefront modal promise an email', async () => {
  const theme = await read('../theme-extension-source/public/appointment-lite.js');
  assert.doesNotMatch(theme, /A confirmation has been sent to your email/);
  assert.match(theme, /Your appointment is confirmed\. You can manage this appointment later\./);
});
