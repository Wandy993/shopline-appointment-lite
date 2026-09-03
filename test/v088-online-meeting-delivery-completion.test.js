import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { Booking } from '../src/models/Booking.js';
import { createBookingAtomic } from '../src/services/bookings.js';
import { publicBooking } from '../src/routes/public.js';
import { buildBookingIcs, googleCalendarAddUrl } from '../src/lib/calendar-links.js';
import { ensureBookingOnlineMeetingSnapshot } from '../src/services/online-meeting.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

function bookingInput() {
  return {
    ruleId: '', productId: '', staffId: '', date: '2026-09-11', time: '12:00', occurrences: [], serviceAddress: '',
    customer: { name: 'Jamie', email: 'jamie@example.com', phone: '' }, note: '', answers: []
  };
}

function onlineRule() {
  return {
    _id: new mongoose.Types.ObjectId(), bookingType: 'standalone', paymentMode: 'none', bookingSource: 'direct', commerceMode: 'standalone_free', sourceType: 'standalone', serviceType: 'appointment',
    bookingMode: 'slot', enabled: true, serviceTitle: 'Home Service', productTitle: '', productId: '', productVariantId: '', duration: 60, buffer: 0, capacity: 1,
    minimumNoticeMinutes: 0, bookingWindowDays: 90, dateFrom: '', dateUntil: '', timezone: 'Asia/Shanghai',
    weeklyAvailability: [{ weekday: 5, enabled: true, windows: [{ start: '09:00', end: '17:00' }] }], availabilityExceptions: [],
    locationMode: 'online', location: 'Online', onlineMeeting: { provider: 'zoom', label: 'Join Meeting', url: 'https://zoom.us/j/123456789?pwd=secret' },
    staff: '', staffAssignment: { mode: 'none', staffIds: [] }, customQuestions: []
  };
}

function schemaBackedBookingModel() {
  return {
    async create(document) {
      const booking = new Booking(document);
      const error = booking.validateSync();
      if (error) throw error;
      return booking;
    }
  };
}

test('online meeting snapshot survives the real Booking schema during booking creation', async () => {
  assert.ok(Booking.schema.path('onlineMeeting'), 'Booking schema must persist the top-level onlineMeeting snapshot');
  const shop = { _id: new mongoose.Types.ObjectId(), timezone: 'Asia/Shanghai', email: '', emailSettings: {} };
  const result = await createBookingAtomic({
    shop,
    rule: onlineRule(),
    input: bookingInput(),
    BookingModel: schemaBackedBookingModel(),
    ReservationModel: null,
    StaffReservationModel: null,
    notifications: false,
    now: new Date('2026-09-03T00:00:00.000Z')
  });
  assert.equal(result.booking.locationMode, 'online');
  assert.equal(result.booking.location, 'Online');
  assert.equal(result.booking.onlineMeeting.provider, 'zoom');
  assert.equal(result.booking.onlineMeeting.label, 'Join Meeting');
  assert.equal(result.booking.onlineMeeting.url, 'https://zoom.us/j/123456789?pwd=secret');
  assert.equal(result.booking.events[0].to.onlineMeeting.url, 'https://zoom.us/j/123456789?pwd=secret');
});


test('legacy online bookings can recover a missing snapshot from the current service rule once', async () => {
  const legacy = { _id: new mongoose.Types.ObjectId(), shopId: new mongoose.Types.ObjectId(), ruleId: new mongoose.Types.ObjectId(), locationMode: 'online', onlineMeeting: undefined };
  const currentRule = { locationMode: 'online', onlineMeeting: { provider: 'zoom', label: 'Join Meeting', url: 'https://zoom.us/j/legacy-recovery' } };
  const RuleModel = {
    findOne() {
      return { select() { return { async lean() { return currentRule; } }; } };
    }
  };
  const BookingModel = {
    async findOneAndUpdate(_filter, update) { return { ...legacy, onlineMeeting: update.$set.onlineMeeting }; }
  };
  const recovered = await ensureBookingOnlineMeetingSnapshot(legacy, { RuleModel, BookingModel });
  assert.equal(recovered.onlineMeeting.url, 'https://zoom.us/j/legacy-recovery');
  assert.equal(recovered.onlineMeeting.label, 'Join Meeting');
});

test('private meeting data is revealed only by confirmed booking serialization', () => {
  const base = {
    _id: new mongoose.Types.ObjectId(), productTitle: 'Home Service', sourceType: 'standalone', bookingSource: 'direct', commerceMode: 'standalone_free',
    bookingMode: 'slot', date: '2026-09-11', time: '12:00', duration: 60, timezone: 'Asia/Shanghai', locationMode: 'online', location: 'Online', staff: 'JANE DOE',
    onlineMeeting: { provider: 'zoom', label: 'Join Meeting', url: 'https://zoom.us/j/123456789?pwd=secret' }, customerRescheduleCount: 0
  };
  const pending = publicBooking({ ...base, status: 'pending_payment' });
  assert.equal(pending.meeting, null);
  const cancelled = publicBooking({ ...base, status: 'cancelled' });
  assert.equal(cancelled.meeting, null);
  const confirmed = publicBooking({ ...base, status: 'confirmed' });
  assert.deepEqual(confirmed.meeting, {
    provider: 'zoom', providerName: 'Zoom', label: 'Join Meeting', url: 'https://zoom.us/j/123456789?pwd=secret'
  });
});

test('customer Google Calendar and ICS details include the confirmed meeting URL but cancelled exports do not', () => {
  const booking = {
    _id: new mongoose.Types.ObjectId(), productTitle: 'Home Service', bookingMode: 'slot', date: '2026-09-11', time: '12:00', duration: 60,
    timezone: 'Asia/Shanghai', location: 'Online', staff: 'JANE DOE', customer: { name: 'Jamie', email: 'jamie@example.com' }, status: 'confirmed',
    onlineMeeting: { provider: 'zoom', label: 'Join Meeting', url: 'https://zoom.us/j/123456789?pwd=secret' }
  };
  const google = new URL(googleCalendarAddUrl(booking));
  assert.match(google.searchParams.get('details') || '', /Zoom: https:\/\/zoom\.us\/j\/123456789\?pwd=secret/);
  assert.match(buildBookingIcs(booking), /Zoom: https:\/\/zoom\.us\/j\/123456789\?pwd=secret/);
  const cancelled = { ...booking, status: 'cancelled' };
  assert.doesNotMatch(new URL(googleCalendarAddUrl(cancelled)).searchParams.get('details') || '', /zoom\.us/);
  assert.doesNotMatch(buildBookingIcs(cancelled), /zoom\.us/);
});

test('public rule payload stays meeting-link free before booking confirmation', async () => {
  const source = await read('../src/routes/public.js');
  const start = source.indexOf('function serializeRule');
  const end = source.indexOf('function publicRuleCacheKey', start);
  assert.ok(start > -1 && end > start);
  assert.doesNotMatch(source.slice(start, end), /onlineMeeting|meetingUrl|Private meeting/i);
});

test('online meeting delivery is wired into reminders, confirmation UIs, manage page, and email CTA copy', async () => {
  const [reminders, theme, hosted, manageView, manageApp, email] = await Promise.all([
    read('../src/services/reminders.js'),
    read('../theme-extension-source/public/appointment-lite.js'),
    read('../public/book/app.js'),
    read('../src/views/manage.js'),
    read('../public/manage/app.js'),
    read('../src/services/email.js')
  ]);
  assert.match(reminders, /timezone location onlineMeeting staff customer status/);
  assert.match(theme, /onlineMeetingAction\(payload\.booking\.meeting\)/);
  assert.match(hosted, /successMeetingActions/);
  assert.match(hosted, /payload\.booking\.meeting\?\.url/);
  assert.match(manageView, /id="meetingCard"/);
  assert.match(manageApp, /booking\.meeting\?\.url/);
  assert.match(email, /meetingLabel/);
  assert.match(email, /escapeHtml\(meetingLabel\)/);
  assert.doesNotMatch(email, />Join online meeting<\/a>/);
});
