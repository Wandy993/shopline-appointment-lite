import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Booking } from '../src/models/Booking.js';
import { CalendarConnection } from '../src/models/CalendarConnection.js';
import { buildGoogleCalendarEvent, deterministicGoogleEventId } from '../src/services/calendar-sync.js';
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, patchGoogleCalendarEvent } from '../src/services/google-calendar.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
function sampleBooking(overrides = {}) { return { _id:'68adc1f67a00000000000001', bookingMode:'slot', productTitle:'Home Service', date:'2026-08-28', time:'14:00', slotKey:'2026-08-28T14:00', duration:60, timezone:'Asia/Shanghai', location:'Shanghai Studio', staff:'Sarah', staffId:'68adc1f67a00000000000002', customer:{name:'Jane Doe',email:'xiangwandi720@gmail.com',phone:'+8613800000000'}, status:'confirmed', ...overrides }; }
function sampleConnection(overrides = {}) { return { _id:'68adc1f67a00000000000003', connectionType:'business', staffId:null, calendarId:'merchant@example.com', calendarTimeZone:'Asia/Shanghai', syncAppointments:true, sendCustomerInvites:true, status:'connected', ...overrides }; }

test('Business Google Calendar event preserves service timezone without sending Google guest invitations', () => {
  const booking=sampleBooking(); const occurrence={date:booking.date,time:booking.time,slotKey:booking.slotKey};
  const {eventId,event,inviteCustomer}=buildGoogleCalendarEvent({booking,occurrence,connection:sampleConnection()});
  assert.equal(inviteCustomer,false); assert.equal(event.attendees,undefined); assert.equal(event.id,eventId); assert.match(eventId,/^[0-9a-f]{40}$/);
  assert.equal(event.start.dateTime,'2026-08-28T14:00:00'); assert.equal(event.start.timeZone,'Asia/Shanghai'); assert.equal(event.end.dateTime,'2026-08-28T15:00:00');
  assert.equal(event.extendedProperties.private.appointmentLite,'1'); assert.equal(event.extendedProperties.private.bookingId,booking._id); assert.equal(event.extendedProperties.private.calendarConnectionType,'business');
});

test('all-day bookings become exclusive-end Google all-day events', () => {
  const booking=sampleBooking({bookingMode:'all_day',time:'00:00',duration:1440,slotKey:'all-day:2026-08-28'});
  const {event}=buildGoogleCalendarEvent({booking,occurrence:{date:'2026-08-28',time:'',slotKey:'all-day:2026-08-28'},connection:sampleConnection()});
  assert.deepEqual(event.start,{date:'2026-08-28'}); assert.deepEqual(event.end,{date:'2026-08-29'});
});

test('single-slot reschedules keep the same Business Calendar event identity', () => {
  const booking=sampleBooking();
  const first=buildGoogleCalendarEvent({booking,occurrence:{date:'2026-08-28',time:'14:00',slotKey:'2026-08-28T14:00'},connection:sampleConnection()});
  const moved=buildGoogleCalendarEvent({booking:{...booking,date:'2026-08-29',time:'16:00',slotKey:'2026-08-29T16:00'},occurrence:{date:'2026-08-29',time:'16:00',slotKey:'2026-08-29T16:00'},connection:sampleConnection()});
  assert.equal(first.eventId,moved.eventId); assert.notEqual(first.event.start.dateTime,moved.event.start.dateTime);
});

test('Google event IDs are deterministic', () => {
  const a=deterministicGoogleEventId({bookingId:'b1',occurrenceKey:'o1',connectionId:'c1'}); const again=deterministicGoogleEventId({bookingId:'b1',occurrenceKey:'o1',connectionId:'c1'}); const other=deterministicGoogleEventId({bookingId:'b1',occurrenceKey:'o2',connectionId:'c1'}); assert.equal(a,again); assert.notEqual(a,other);
});

test('Google Calendar event API can write, patch, and delete without attendee sendUpdates', async () => {
  const originalFetch=global.fetch; const calls=[]; global.fetch=async (target,options={})=>{calls.push({target:String(target),options}); if(options.method==='DELETE')return new Response(null,{status:204}); return new Response(JSON.stringify({id:'event123'}),{status:200,headers:{'Content-Type':'application/json'}});};
  try { await createGoogleCalendarEvent({accessToken:'token',calendarId:'primary@example.com',event:{id:'event123',start:{date:'2026-08-28'},end:{date:'2026-08-29'}},sendUpdates:''}); await patchGoogleCalendarEvent({accessToken:'token',calendarId:'primary@example.com',eventId:'event123',event:{summary:'Updated'},sendUpdates:''}); await deleteGoogleCalendarEvent({accessToken:'token',calendarId:'primary@example.com',eventId:'event123',sendUpdates:''}); } finally { global.fetch=originalFetch; }
  assert.equal(calls.length,3); assert.doesNotMatch(calls[0].target,/sendUpdates=all/); assert.doesNotMatch(calls[1].target,/sendUpdates=all/); assert.doesNotMatch(calls[2].target,/sendUpdates=all/);
});

test('Booking and CalendarConnection persist sync state without exposing Google secrets', () => {
  assert.ok(Booking.schema.path('calendarEvents')); assert.ok(Booking.schema.path('calendarSyncStatus')); assert.ok(Booking.schema.path('lastCalendarSyncAt')); assert.equal(CalendarConnection.schema.path('syncAppointments').options.default,true); assert.equal(CalendarConnection.schema.path('sendCustomerInvites').options.default,false); assert.equal(CalendarConnection.schema.path('refreshTokenEncrypted').options.select,false);
});

test('booking lifecycle uses only the merchant Business Calendar and retires staff OAuth UI', async () => {
  const [bookings,routes,integrations,adminAsset,adminView,calendarService]=await Promise.all([read('../src/services/bookings.js'),read('../src/routes/admin.js'),read('../src/routes/integrations.js'),read('../public/admin/app.js'),read('../src/views/admin.js'),read('../src/services/calendar-sync.js')]);
  assert.match(bookings,/queueBookingGoogleCalendarSync\(booking\._id, 'created'\)/); assert.match(bookings,/queueBookingGoogleCalendarSync\(updated\._id, 'customer_rescheduled'\)/); assert.match(bookings,/queueBookingGoogleCalendarSync\(booking\._id, 'customer_cancelled'\)/);
  assert.match(routes,/\/calendar\/google\/store\/connect/); assert.match(routes,/STAFF_GOOGLE_CALENDAR_RETIRED/); assert.match(integrations,/state\.connectionType !== 'business'/);
  assert.match(adminAsset,/data-calendar-sync-now/); assert.doesNotMatch(adminAsset,/data-calendar-setting="syncAppointments"|Connect personal Google Calendar/); assert.match(adminView,/BUSINESS CALENDAR/); assert.doesNotMatch(adminView,/PERSONAL STAFF CALENDARS/);
  assert.match(calendarService,/connectionType\(connection\) === 'business'/); assert.match(calendarService,/const inviteCustomer = false/);
});
