import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('v0.5.1 staff profile exposes avatars, notification opt-in, and team schedule', async () => {
  const [view, admin, styles, routes, model, validation] = await Promise.all([
    readFile(new URL('../src/views/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/admin/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/models/Staff.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/validation.js', import.meta.url), 'utf8')
  ]);
  assert.match(view, /staffAvatarPresets/);
  assert.match(view, /Upload image/);
  assert.match(view, /staffEmailNotifications/);
  assert.match(view, /staffOperationsList/);
  assert.match(admin, /processStaffAvatarFile/);
  assert.match(admin, /loadStaffOperations/);
  assert.match(styles, /Staff Notifications \+ Staff Operations/);
  assert.match(routes, /\/staff\/operations/);
  assert.match(routes, /'staffAssignment\.mode': \{ \$in: \['any', 'customer_choice', 'fixed'\] \}/);
  assert.match(model, /emailEnabled: \{ type: Boolean, default: false \}/);
  assert.match(validation, /emailEnabled: Boolean\(email && body\.notifications\?\.emailEnabled === true\)/);
});

test('storefront uses a custom Appointment Lite staff picker instead of a native select', async () => {
  const [hostedView, hostedApp, hostedStyles, theme, themeStyles] = await Promise.all([
    readFile(new URL('../src/views/book.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.css', import.meta.url), 'utf8')
  ]);
  assert.match(hostedView, /class="staff-picker"/);
  assert.doesNotMatch(hostedView, /<select[^>]+staff/i);
  assert.match(hostedApp, /renderStaffPicker/);
  assert.match(hostedStyles, /\.staff-picker-menu/);
  assert.match(theme, /class="al-staff-picker"/);
  assert.doesNotMatch(theme, /<select[^>]+al-staff/i);
  assert.match(themeStyles, /\.al-staff-menu/);
});

test('staff booking lifecycle notifications are wired without blocking booking operations', async () => {
  const [emailSource, bookingSource] = await Promise.all([
    readFile(new URL('../src/services/email.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/bookings.js', import.meta.url), 'utf8')
  ]);
  assert.match(emailSource, /sendStaffAssignedNotification/);
  assert.match(emailSource, /sendStaffBookingUpdatedNotification/);
  assert.match(emailSource, /sendStaffCancelledNotification/);
  assert.match(emailSource, /notifications\?\.emailEnabled !== true/);
  assert.match(bookingSource, /Promise\.resolve\(sendStaffAssignedNotification/);
  assert.match(bookingSource, /Promise\.resolve\(sendStaffBookingUpdatedNotification/);
  assert.match(bookingSource, /Promise\.resolve\(sendStaffCancelledNotification/);
});
