import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Booking } from '../src/models/Booking.js';
import { CalendarConnection } from '../src/models/CalendarConnection.js';
import { buildGoogleCalendarEvent, deterministicGoogleEventId } from '../src/services/calendar-sync.js';
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, patchGoogleCalendarEvent } from '../src/services/google-calendar.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

function sampleBooking(overrides = {}) {
  return {
    _id: '68adc1f67a00000000000001',
    bookingMode: 'slot',
    productTitle: 'Home Service',
    date: '2026-08-28',
    time: '14:00',
    slotKey: '2026-08-28T14:00',
    duration: 60,
    timezone: 'Asia/Shanghai',
    location: 'Shanghai Studio',
    staff: 'Sarah',
    staffId: '68adc1f67a00000000000002',
    customer: { name: 'Jane Doe', email: 'xiangwandi720@gmail.com', phone: '+8613800000000' },
    ...overrides
  };
}

function sampleConnection(overrides = {}) {
  return {
    _id: '68adc1f67a00000000000003',
    calendarId: 'wandi.xiang@shopline.com',
    calendarTimeZone: 'Asia/Shanghai',
    syncAppointments: true,
    sendCustomerInvites: true,
    ...overrides
  };
}

test('Google Calendar event payload preserves service timezone and invites the booking email by default', () => {
  const booking = sampleBooking();
  const occurrence = { date: booking.date, time: booking.time, slotKey: booking.slotKey };
  const { eventId, event, inviteCustomer } = buildGoogleCalendarEvent({ booking, occurrence, connection: sampleConnection() });
  assert.equal(inviteCustomer, true);
  assert.equal(event.id, eventId);
  assert.match(eventId, /^[0-9a-f]{40}$/);
  assert.equal(event.start.dateTime, '2026-08-28T14:00:00');
  assert.equal(event.start.timeZone, 'Asia/Shanghai');
  assert.equal(event.end.dateTime, '2026-08-28T15:00:00');
  assert.equal(event.attendees[0].email, 'xiangwandi720@gmail.com');
  assert.equal(event.extendedProperties.private.appointmentLite, '1');
  assert.equal(event.extendedProperties.private.bookingId, booking._id);
  assert.match(event.summary, /Home Service/);
  assert.match(event.summary, /Jane Doe/);
});

test('customer invitation can be disabled without disabling staff calendar sync', () => {
  const booking = sampleBooking();
  const occurrence = { date: booking.date, time: booking.time, slotKey: booking.slotKey };
  const { event, inviteCustomer } = buildGoogleCalendarEvent({ booking, occurrence, connection: sampleConnection({ sendCustomerInvites: false }) });
  assert.equal(inviteCustomer, false);
  assert.equal(event.attendees, undefined);
  assert.equal(event.start.timeZone, 'Asia/Shanghai');
});

test('all-day bookings become exclusive-end Google all-day events', () => {
  const booking = sampleBooking({ bookingMode: 'all_day', time: '00:00', duration: 1440, slotKey: 'all-day:2026-08-28' });
  const occurrence = { date: '2026-08-28', time: '', slotKey: 'all-day:2026-08-28' };
  const { event } = buildGoogleCalendarEvent({ booking, occurrence, connection: sampleConnection() });
  assert.deepEqual(event.start, { date: '2026-08-28' });
  assert.deepEqual(event.end, { date: '2026-08-29' });
});

test('single-slot reschedules keep the same Google event identity so guests receive an update instead of a replacement invite', () => {
  const booking = sampleBooking();
  const first = buildGoogleCalendarEvent({ booking, occurrence: { date: '2026-08-28', time: '14:00', slotKey: '2026-08-28T14:00' }, connection: sampleConnection() });
  const moved = buildGoogleCalendarEvent({ booking: { ...booking, date: '2026-08-29', time: '16:00', slotKey: '2026-08-29T16:00' }, occurrence: { date: '2026-08-29', time: '16:00', slotKey: '2026-08-29T16:00' }, connection: sampleConnection() });
  assert.equal(first.eventId, moved.eventId);
  assert.notEqual(first.event.start.dateTime, moved.event.start.dateTime);
});

test('Google event IDs are deterministic across retries and change across staff or occurrences', () => {
  const a = deterministicGoogleEventId({ bookingId: 'b1', occurrenceKey: 'o1', staffId: 's1' });
  const again = deterministicGoogleEventId({ bookingId: 'b1', occurrenceKey: 'o1', staffId: 's1' });
  const moved = deterministicGoogleEventId({ bookingId: 'b1', occurrenceKey: 'o1', staffId: 's2' });
  const rescheduled = deterministicGoogleEventId({ bookingId: 'b1', occurrenceKey: 'o2', staffId: 's1' });
  assert.equal(a, again);
  assert.notEqual(a, moved);
  assert.notEqual(a, rescheduled);
});

test('Google Calendar event API uses sendUpdates for customer invitations and cancellations', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (target, options = {}) => {
    calls.push({ target: String(target), options });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 'event123', htmlLink: 'https://calendar.google.com/event?eid=event123' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    await createGoogleCalendarEvent({ accessToken: 'token', calendarId: 'primary@example.com', event: { id: 'event123', start: { date: '2026-08-28' }, end: { date: '2026-08-29' } }, sendUpdates: 'all' });
    await patchGoogleCalendarEvent({ accessToken: 'token', calendarId: 'primary@example.com', eventId: 'event123', event: { summary: 'Updated' }, sendUpdates: 'all' });
    await deleteGoogleCalendarEvent({ accessToken: 'token', calendarId: 'primary@example.com', eventId: 'event123', sendUpdates: 'all' });
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(calls.length, 3);
  assert.match(calls[0].target, /calendars\/primary%40example\.com\/events\?sendUpdates=all/);
  assert.equal(calls[0].options.method, 'POST');
  assert.match(calls[1].target, /events\/event123\?sendUpdates=all/);
  assert.equal(calls[1].options.method, 'PATCH');
  assert.match(calls[2].target, /events\/event123\?sendUpdates=all/);
  assert.equal(calls[2].options.method, 'DELETE');
});

test('Booking and CalendarConnection persist live sync state without exposing Google secrets', () => {
  assert.ok(Booking.schema.path('calendarEvents'));
  assert.ok(Booking.schema.path('calendarSyncStatus'));
  assert.ok(Booking.schema.path('lastCalendarSyncAt'));
  assert.equal(CalendarConnection.schema.path('syncAppointments').options.default, true);
  assert.equal(CalendarConnection.schema.path('sendCustomerInvites').options.default, false);
  assert.ok(CalendarConnection.schema.path('lastSyncAt'));
  assert.equal(CalendarConnection.schema.path('refreshTokenEncrypted').options.select, false);
});

test('booking lifecycle, admin routes, and Calendar Sync UI are wired to Google appointment reconciliation', async () => {
  const [bookings, routes, integrations, adminAsset, adminView, calendarService] = await Promise.all([
    read('../src/services/bookings.js'),
    read('../src/routes/admin.js'),
    read('../src/routes/integrations.js'),
    read('../public/admin/app.js'),
    read('../src/views/admin.js'),
    read('../src/services/calendar-sync.js')
  ]);
  assert.match(bookings, /queueBookingGoogleCalendarSync\(booking\._id, 'created'\)/);
  assert.match(bookings, /queueBookingGoogleCalendarSync\(updated\._id, 'customer_rescheduled'\)/);
  assert.match(bookings, /queueBookingGoogleCalendarSync\(updated\._id, 'merchant_updated'\)/);
  assert.match(bookings, /queueBookingGoogleCalendarSync\(booking\._id, 'customer_cancelled'\)/);
  assert.match(bookings, /queueBookingGoogleCalendarSync\(booking\._id, 'merchant_cancelled'\)/);
  assert.match(routes, /\/calendar\/google\/:staffId\/settings/);
  assert.match(routes, /\/calendar\/google\/:staffId\/sync/);
  assert.match(integrations, /queueUpcomingGoogleCalendarBookingsForStaff/);
  assert.match(adminAsset, /data-calendar-setting="syncAppointments"/);
  assert.match(adminAsset, /data-calendar-setting="sendCustomerInvites"/);
  assert.match(adminAsset, /data-calendar-sync-now/);
  assert.match(adminView, /BUSINESS CALENDAR/);
  assert.match(adminView, /PERSONAL STAFF CALENDARS/);
  assert.match(calendarService, /extendedProperties/);
  assert.match(calendarService, /sendCustomerInvites/);
});
