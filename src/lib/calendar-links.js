import { config } from '../config.js';
import { readSignedPayload, signPayload } from './signature.js';

function text(value) { return String(value ?? ''); }
function compact(value) { return text(value).replace(/\r?\n/g, ' ').trim(); }
function icsEscape(value) {
  return text(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
function icsDateTime(date, time) { return `${date.replaceAll('-', '')}T${time.replace(':', '')}00`; }
function addMinutes(date, time, minutes) {
  const point = new Date(`${date}T${time}:00Z`);
  point.setUTCMinutes(point.getUTCMinutes() + Math.max(1, Number(minutes || 1)));
  const iso = point.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}
function addDays(date, days = 1) {
  const point = new Date(`${date}T12:00:00Z`);
  point.setUTCDate(point.getUTCDate() + days);
  return point.toISOString().slice(0, 10);
}

export function createBookingCalendarToken(bookingId, now = Date.now()) {
  return signPayload({
    type: 'booking_calendar',
    bookingId: text(bookingId),
    exp: now + 366 * 24 * 60 * 60 * 1000
  }, config.sessionSecret);
}

export function readBookingCalendarToken(value) {
  const payload = readSignedPayload(value, config.sessionSecret);
  if (!payload || payload.type !== 'booking_calendar' || !payload.bookingId || Number(payload.exp || 0) < Date.now()) return null;
  return payload;
}

export function occurrenceListForCalendar(booking) {
  const mode = booking.bookingMode || 'slot';
  if (Array.isArray(booking.occurrences) && booking.occurrences.length) {
    return booking.occurrences.map(item => ({ date: item.date, time: mode === 'all_day' ? '' : (item.time || '') }));
  }
  return [{ date: booking.date, time: mode === 'all_day' ? '' : booking.time }];
}

export function googleCalendarAddUrl(booking) {
  if ((booking.bookingMode || 'slot') === 'multi_slot') return '';
  const occurrence = occurrenceListForCalendar(booking)[0];
  if (!occurrence?.date) return '';
  const params = new URLSearchParams({ action: 'TEMPLATE' });
  params.set('text', compact(`${booking.productTitle || 'Appointment'}${booking.staff ? ` · ${booking.staff}` : ''}`));
  const details = [
    'Appointment Lite booking',
    booking.customer?.name ? `Customer: ${booking.customer.name}` : '',
    booking.staff ? `Staff: ${booking.staff}` : '',
    booking.customer?.email ? `Email: ${booking.customer.email}` : ''
  ].filter(Boolean).join('\n');
  params.set('details', details);
  if (booking.location) params.set('location', compact(booking.location));
  const timezone = booking.timezone || 'UTC';
  params.set('ctz', timezone);
  if ((booking.bookingMode || 'slot') === 'all_day') {
    params.set('dates', `${occurrence.date.replaceAll('-', '')}/${addDays(occurrence.date, 1).replaceAll('-', '')}`);
  } else {
    const end = addMinutes(occurrence.date, occurrence.time, booking.duration || 30);
    params.set('dates', `${icsDateTime(occurrence.date, occurrence.time)}/${icsDateTime(end.date, end.time)}`);
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function bookingIcsUrl(booking) {
  const token = createBookingCalendarToken(booking._id);
  return `${config.appUrl}/api/public/bookings/${encodeURIComponent(text(booking._id))}/calendar.ics?token=${encodeURIComponent(token)}`;
}

export function calendarLinksForBooking(booking) {
  return { google: googleCalendarAddUrl(booking), ics: bookingIcsUrl(booking) };
}

export function buildBookingIcs(booking) {
  const mode = booking.bookingMode || 'slot';
  const occurrences = occurrenceListForCalendar(booking);
  const status = booking.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED';
  const hostname = (() => { try { return new URL(config.appUrl).hostname; } catch { return 'appointment-lite'; } })();
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const events = occurrences.map((occurrence, index) => {
    const uid = `appointment-lite-${booking._id}-${index + 1}@${hostname}`;
    const summary = icsEscape(`${booking.productTitle || 'Appointment'}${booking.staff ? ` · ${booking.staff}` : ''}`);
    const description = icsEscape([
      'Appointment Lite booking',
      booking.customer?.name ? `Customer: ${booking.customer.name}` : '',
      booking.staff ? `Staff: ${booking.staff}` : '',
      booking.customer?.email ? `Email: ${booking.customer.email}` : ''
    ].filter(Boolean).join('\n'));
    const lines = [
      'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${now}`, `STATUS:${status}`, `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`
    ];
    if (booking.location) lines.push(`LOCATION:${icsEscape(booking.location)}`);
    if (mode === 'all_day') {
      lines.push(`DTSTART;VALUE=DATE:${occurrence.date.replaceAll('-', '')}`);
      lines.push(`DTEND;VALUE=DATE:${addDays(occurrence.date, 1).replaceAll('-', '')}`);
    } else {
      const end = addMinutes(occurrence.date, occurrence.time, booking.duration || 30);
      const tz = icsEscape(booking.timezone || 'UTC');
      lines.push(`DTSTART;TZID=${tz}:${icsDateTime(occurrence.date, occurrence.time)}`);
      lines.push(`DTEND;TZID=${tz}:${icsDateTime(end.date, end.time)}`);
    }
    lines.push('END:VEVENT');
    return lines.join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Appointment Lite//Booking Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...events, 'END:VCALENDAR', ''].join('\r\n');
}
