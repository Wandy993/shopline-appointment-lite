import { createHash } from 'node:crypto';
import { Booking } from '../models/Booking.js';
import { CalendarConnection } from '../models/CalendarConnection.js';
import {
  accessTokenForConnection,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  patchGoogleCalendarEvent
} from './google-calendar.js';

const PROVIDER = 'google';
const MAX_BOOKING_MAPPINGS = 50;

function asString(value) {
  return value == null ? '' : String(value);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asString(value).trim());
}

function occurrenceList(booking) {
  const mode = booking.bookingMode || 'slot';
  if (Array.isArray(booking.occurrences) && booking.occurrences.length) {
    return booking.occurrences.map(item => ({
      date: item.date,
      time: mode === 'all_day' ? '' : (item.time || ''),
      slotKey: item.slotKey || `${item.date}T${item.time || ''}`
    }));
  }
  return [{
    date: booking.date,
    time: mode === 'all_day' ? '' : booking.time,
    slotKey: booking.slotKey || `${booking.date}T${booking.time || ''}`
  }];
}

function addDays(date, amount = 1) {
  const point = new Date(`${date}T12:00:00Z`);
  point.setUTCDate(point.getUTCDate() + amount);
  return point.toISOString().slice(0, 10);
}

function addMinutes(date, time, minutes) {
  const point = new Date(`${date}T${time}:00Z`);
  point.setUTCMinutes(point.getUTCMinutes() + Math.max(1, Number(minutes || 1)));
  const iso = point.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function deterministicGoogleEventId({ bookingId, occurrenceKey, staffId }) {
  return createHash('sha256')
    .update(`${asString(bookingId)}:${asString(occurrenceKey)}:${asString(staffId)}`)
    .digest('hex')
    .slice(0, 40);
}

export function buildGoogleCalendarEvent({ booking, occurrence, connection }) {
  const mode = booking.bookingMode || 'slot';
  const timezone = booking.timezone || connection.calendarTimeZone || 'UTC';
  const customerName = asString(booking.customer?.name).trim();
  const customerEmail = asString(booking.customer?.email).trim().toLowerCase();
  const customerPhone = asString(booking.customer?.phone).trim();
  const serviceTitle = asString(booking.productTitle || 'Appointment').trim() || 'Appointment';
  const staffName = asString(booking.staff).trim();
  const bookingId = asString(booking._id);
  const occurrenceKey = asString(occurrence.slotKey || `${occurrence.date}T${occurrence.time || ''}`);
  const inviteCustomer = connection.sendCustomerInvites !== false && validEmail(customerEmail);
  const eventIdentity = mode === 'slot' ? 'primary' : occurrenceKey;
  const eventId = deterministicGoogleEventId({ bookingId, occurrenceKey: eventIdentity, staffId: booking.staffId });

  const description = [
    'Appointment Lite booking',
    '',
    `Customer: ${customerName || 'Customer'}`,
    customerEmail ? `Email: ${customerEmail}` : '',
    customerPhone ? `Phone: ${customerPhone}` : '',
    `Service: ${serviceTitle}`,
    staffName ? `Staff: ${staffName}` : '',
    booking.location ? `Location: ${booking.location}` : '',
    `Booking ID: ${bookingId}`
  ].filter(Boolean).join('\n');

  const event = {
    id: eventId,
    summary: `${serviceTitle}${customerName ? ` · ${customerName}` : ''}`,
    description,
    location: asString(booking.location),
    transparency: 'opaque',
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: false,
    extendedProperties: {
      private: {
        appointmentLite: '1',
        bookingId,
        occurrenceKey,
        staffId: asString(booking.staffId),
        calendarConnectionId: asString(connection._id)
      }
    }
  };

  if (mode === 'all_day') {
    event.start = { date: occurrence.date };
    event.end = { date: addDays(occurrence.date, 1) };
  } else {
    const end = addMinutes(occurrence.date, occurrence.time, booking.duration || 30);
    event.start = { dateTime: `${occurrence.date}T${occurrence.time}:00`, timeZone: timezone };
    event.end = { dateTime: `${end.date}T${end.time}:00`, timeZone: timezone };
  }

  if (inviteCustomer) {
    event.attendees = [{ email: customerEmail, displayName: customerName || undefined }];
  }

  return { eventId, event, inviteCustomer };
}

function mappingObject(mapping) {
  if (!mapping) return null;
  const value = typeof mapping.toObject === 'function' ? mapping.toObject() : mapping;
  return {
    provider: value.provider || PROVIDER,
    connectionId: value.connectionId || null,
    staffId: value.staffId || null,
    calendarId: value.calendarId || '',
    occurrenceKey: value.occurrenceKey || '',
    eventId: value.eventId || '',
    htmlLink: value.htmlLink || '',
    customerInvited: Boolean(value.customerInvited),
    status: value.status || 'synced',
    lastError: value.lastError || '',
    lastSyncedAt: value.lastSyncedAt || null
  };
}

async function connectionForMapping(mapping) {
  if (!mapping?.connectionId) return null;
  return CalendarConnection.findOne({ _id: mapping.connectionId, provider: PROVIDER }).select('+refreshTokenEncrypted');
}

async function removeMappedEvent(mapping) {
  const existing = mappingObject(mapping);
  if (!existing?.eventId || !existing?.calendarId) return { ...existing, status: 'deleted', lastError: '', lastSyncedAt: new Date() };
  const connection = await connectionForMapping(existing);
  if (!connection) {
    return { ...existing, status: 'orphaned', lastError: 'Google Calendar connection is no longer available.', lastSyncedAt: new Date() };
  }
  try {
    const accessToken = await accessTokenForConnection(connection);
    await deleteGoogleCalendarEvent({
      accessToken,
      calendarId: existing.calendarId,
      eventId: existing.eventId,
      sendUpdates: existing.customerInvited ? 'all' : ''
    });
    return { ...existing, status: 'deleted', lastError: '', lastSyncedAt: new Date() };
  } catch (error) {
    return { ...existing, status: 'error', lastError: asString(error.message).slice(0, 500), lastSyncedAt: new Date() };
  }
}

function isCurrentMapping(mapping, connection, booking, occurrenceKey) {
  return asString(mapping.staffId) === asString(booking.staffId)
    && asString(mapping.connectionId) === asString(connection._id)
    && asString(mapping.calendarId) === asString(connection.calendarId)
    && asString(mapping.occurrenceKey) === asString(occurrenceKey)
    && mapping.status !== 'deleted';
}

async function upsertMappedEvent({ booking, occurrence, connection, accessToken, existing }) {
  const { eventId, event, inviteCustomer } = buildGoogleCalendarEvent({ booking, occurrence, connection });
  const sendUpdates = existing?.customerInvited || inviteCustomer ? 'all' : '';
  const patch = { ...event };
  delete patch.id;

  // Do not reset an attendee's Google response on ordinary appointment updates.
  // Add attendees only when the connection has just enabled customer invitations
  // or when this is a brand-new Google event.
  if (existing?.customerInvited) delete patch.attendees;

  let result;
  if (existing?.eventId) {
    try {
      result = await patchGoogleCalendarEvent({
        accessToken,
        calendarId: connection.calendarId,
        eventId: existing.eventId,
        event: patch,
        sendUpdates
      });
    } catch (error) {
      if (![404, 410].includes(Number(error?.providerStatus))) throw error;
    }
  }

  if (!result) {
    try {
      result = await createGoogleCalendarEvent({
        accessToken,
        calendarId: connection.calendarId,
        event,
        sendUpdates: inviteCustomer ? 'all' : ''
      });
    } catch (error) {
      if (Number(error?.providerStatus) !== 409) throw error;
      result = await patchGoogleCalendarEvent({
        accessToken,
        calendarId: connection.calendarId,
        eventId,
        event: patch,
        sendUpdates
      });
    }
  }

  return {
    provider: PROVIDER,
    connectionId: connection._id,
    staffId: booking.staffId,
    calendarId: connection.calendarId,
    occurrenceKey: occurrence.slotKey || `${occurrence.date}T${occurrence.time || ''}`,
    eventId: result?.id || existing?.eventId || eventId,
    htmlLink: result?.htmlLink || existing?.htmlLink || '',
    customerInvited: Boolean(existing?.customerInvited || inviteCustomer),
    status: 'synced',
    lastError: '',
    lastSyncedAt: new Date()
  };
}

async function markConnectionSync(connection, error = null) {
  if (!connection?._id) return;
  await CalendarConnection.updateOne(
    { _id: connection._id },
    {
      $set: {
        lastSyncAt: new Date(),
        lastSyncError: error ? asString(error.message || error).slice(0, 500) : ''
      }
    }
  ).catch(() => {});
}

export async function reconcileBookingGoogleCalendar(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return { bookingId: asString(bookingId), skipped: true, reason: 'BOOKING_NOT_FOUND' };

  const mappings = (booking.calendarEvents || []).map(mappingObject).filter(Boolean);
  const staffId = booking.staffId ? asString(booking.staffId) : '';
  let connection = null;

  if (booking.status === 'confirmed' && staffId) {
    connection = await CalendarConnection.findOne({
      shopId: booking.shopId,
      staffId: booking.staffId,
      provider: PROVIDER,
      status: 'connected'
    }).select('+refreshTokenEncrypted');
  }

  const syncEnabled = Boolean(connection && connection.calendarId && connection.syncAppointments !== false);
  const desiredOccurrences = syncEnabled ? occurrenceList(booking) : [];
  const currentKeys = new Set(desiredOccurrences.map(item => asString(item.slotKey || `${item.date}T${item.time || ''}`)));
  const retained = [];
  const stale = [];

  for (const mapping of mappings) {
    const sameStaff = asString(mapping.staffId) === staffId;
    const sameConnection = connection && asString(mapping.connectionId) === asString(connection._id);
    const sameCalendar = connection && asString(mapping.calendarId) === asString(connection.calendarId);
    const currentOccurrence = currentKeys.has(asString(mapping.occurrenceKey));
    const occurrenceStillDesired = (booking.bookingMode || 'slot') === 'slot' ? true : currentOccurrence;

    if (booking.status !== 'confirmed') stale.push(mapping);
    else if (!sameStaff) stale.push(mapping);
    else if (syncEnabled && (!sameConnection || !sameCalendar || !occurrenceStillDesired)) stale.push(mapping);
    else retained.push(mapping);
  }

  const deleted = [];
  for (const mapping of stale) deleted.push(await removeMappedEvent(mapping));

  // If the staff connection is absent/paused, preserve same-staff mappings as-is.
  if (!syncEnabled) {
    const nextMappings = [...retained, ...deleted].slice(-MAX_BOOKING_MAPPINGS);
    const hasError = deleted.some(item => ['error', 'orphaned'].includes(item.status));
    await Booking.updateOne({ _id: booking._id }, {
      $set: {
        calendarEvents: nextMappings,
        calendarSyncStatus: hasError ? 'error' : (mappings.length ? 'paused' : 'not_connected'),
        calendarSyncError: hasError ? deleted.find(item => item.lastError)?.lastError || '' : '',
        lastCalendarSyncAt: new Date()
      }
    });
    return { bookingId: asString(booking._id), skipped: true, reason: connection ? 'SYNC_PAUSED' : 'NO_CONNECTED_CALENDAR', deleted: deleted.length };
  }

  let accessToken;
  try {
    accessToken = await accessTokenForConnection(connection);
  } catch (error) {
    await markConnectionSync(connection, error);
    await Booking.updateOne({ _id: booking._id }, {
      $set: { calendarSyncStatus: 'error', calendarSyncError: asString(error.message).slice(0, 500), lastCalendarSyncAt: new Date() }
    });
    throw error;
  }

  const synced = [];
  const errors = [];
  for (const occurrence of desiredOccurrences) {
    const key = asString(occurrence.slotKey || `${occurrence.date}T${occurrence.time || ''}`);
    const existing = (booking.bookingMode || 'slot') === 'slot'
      ? retained.find(mapping => asString(mapping.staffId) === asString(booking.staffId) && asString(mapping.connectionId) === asString(connection._id) && asString(mapping.calendarId) === asString(connection.calendarId) && mapping.status !== 'deleted')
      : retained.find(mapping => isCurrentMapping(mapping, connection, booking, key));
    try {
      synced.push(await upsertMappedEvent({ booking, occurrence, connection, accessToken, existing }));
    } catch (error) {
      const failure = {
        provider: PROVIDER,
        connectionId: connection._id,
        staffId: booking.staffId,
        calendarId: connection.calendarId,
        occurrenceKey: key,
        eventId: existing?.eventId || deterministicGoogleEventId({ bookingId: booking._id, occurrenceKey: (booking.bookingMode || 'slot') === 'slot' ? 'primary' : key, staffId: booking.staffId }),
        htmlLink: existing?.htmlLink || '',
        customerInvited: Boolean(existing?.customerInvited),
        status: 'error',
        lastError: asString(error.message).slice(0, 500),
        lastSyncedAt: new Date()
      };
      synced.push(failure);
      errors.push(error);
    }
  }

  const nextMappings = [...deleted, ...synced].slice(-MAX_BOOKING_MAPPINGS);
  const firstError = synced.find(item => item.status === 'error')?.lastError || deleted.find(item => ['error', 'orphaned'].includes(item.status))?.lastError || '';
  await Booking.updateOne({ _id: booking._id }, {
    $set: {
      calendarEvents: nextMappings,
      calendarSyncStatus: firstError ? 'error' : 'synced',
      calendarSyncError: firstError,
      lastCalendarSyncAt: new Date()
    }
  });
  await markConnectionSync(connection, firstError || null);

  return {
    bookingId: asString(booking._id),
    synced: synced.filter(item => item.status === 'synced').length,
    deleted: deleted.filter(item => item.status === 'deleted').length,
    errors: errors.length + deleted.filter(item => ['error', 'orphaned'].includes(item.status)).length
  };
}

export function queueBookingGoogleCalendarSync(bookingId, reason = 'booking_changed') {
  if (!bookingId) return;
  setImmediate(() => {
    reconcileBookingGoogleCalendar(bookingId).catch(error => {
      console.error(`Google Calendar booking sync failed (${reason})`, asString(error.message || error));
    });
  });
}

export async function syncUpcomingGoogleCalendarBookingsForStaff({ shopId, staffId, limit = 200 }) {
  const today = new Date().toISOString().slice(0, 10);
  const bookings = await Booking.find({
    shopId,
    staffId,
    status: 'confirmed',
    date: { $gte: today }
  }).sort({ date: 1, time: 1 }).limit(Math.max(1, Math.min(500, Number(limit || 200)))).select('_id').lean();

  const summary = { total: bookings.length, synced: 0, deleted: 0, errors: 0, skipped: 0 };
  for (const booking of bookings) {
    try {
      const result = await reconcileBookingGoogleCalendar(booking._id);
      summary.synced += Number(result.synced || 0);
      summary.deleted += Number(result.deleted || 0);
      summary.errors += Number(result.errors || 0);
      if (result.skipped) summary.skipped += 1;
    } catch (error) {
      summary.errors += 1;
    }
  }
  if (summary.errors === 0) {
    await CalendarConnection.updateOne(
      { shopId, staffId, provider: PROVIDER },
      { $set: { lastSyncAt: new Date(), lastSyncError: '' } }
    ).catch(() => {});
  }
  return summary;
}

export function queueUpcomingGoogleCalendarBookingsForStaff(values) {
  setImmediate(() => {
    syncUpcomingGoogleCalendarBookingsForStaff(values).catch(error => {
      console.error('Google Calendar staff sync failed', asString(error.message || error));
    });
  });
}
