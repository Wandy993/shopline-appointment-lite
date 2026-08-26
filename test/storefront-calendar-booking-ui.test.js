import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('hosted booking page uses a calendar-first two-column experience', async () => {
  const [view, app, styles] = await Promise.all([
    readFile(new URL('../src/views/book.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/book/styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(view, /class="booking-layout"/);
  assert.match(view, /id="calendarGrid"/);
  assert.match(view, /id="calendarPrev"/);
  assert.match(view, /id="calendarNext"/);
  assert.match(view, /id="bookingDate" name="date" type="hidden"/);
  assert.doesNotMatch(view, /id="bookingDate"[^>]+type="date"/);
  assert.match(app, /function renderCalendar\(\)/);
  assert.match(app, /function serviceOpenOnDate\(date\)/);
  assert.match(app, /async function selectDate\(date/);
  assert.match(styles, /\.booking-layout\{[^}]*grid-template-columns/);
  assert.match(styles, /\.calendar-grid\{[^}]*grid-template-columns:repeat\(7/);
  assert.match(styles, /@media\(max-width:840px\)[\s\S]*?\.booking-layout\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(view, /id="timezonePicker"/);
  assert.match(app, /const availabilityCache = new Map\(\)/);
  assert.match(app, /function setAvailabilityLoading\(loading\)/);
  assert.match(app, /function prefetchAvailability\(date\)/);
  assert.match(app, /customerTimezone/);
  assert.match(styles, /\.time-slots\{[^}]*max-height:92px/);
  assert.match(styles, /\.slots-loading-overlay/);
});

test('theme App Block uses the same calendar-first storefront layout', async () => {
  const [asset, styles] = await Promise.all([
    readFile(new URL('../theme-extension-source/public/appointment-lite.js', import.meta.url), 'utf8'),
    readFile(new URL('../theme-extension-source/public/appointment-lite.css', import.meta.url), 'utf8')
  ]);
  assert.match(asset, /al-booking-dialog/);
  assert.match(asset, /class="al-booking-layout"/);
  assert.match(asset, /class="al-calendar-grid"/);
  assert.match(asset, /type="hidden" name="date"/);
  assert.match(asset, /calendarServiceOpen/);
  assert.match(asset, /mode === 'all_day'/);
  assert.match(asset, /mode === 'multi_slot'/);
  assert.match(styles, /\.al-booking-dialog\{[^}]*1060px/);
  assert.match(styles, /\.al-booking-layout\{[^}]*grid-template-columns/);
  assert.match(styles, /\.al-calendar-grid\{[^}]*grid-template-columns:repeat\(7/);
  assert.match(styles, /@media\(max-width:820px\)[\s\S]*?\.al-booking-layout\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(asset, /al-timezone-picker/);
  assert.match(asset, /const availabilityCache = new Map\(\)/);
  assert.match(asset, /const setAvailabilityLoading = loading =>/);
  assert.match(asset, /customerTimezone/);
  assert.match(styles, /height:min\(760px,calc\(100dvh - 30px\)\)/);
  assert.match(styles, /\.al-booking-dialog \.al-times\{[^}]*max-height:90px/);
  assert.match(styles, /\.al-slots-loading/);
});
