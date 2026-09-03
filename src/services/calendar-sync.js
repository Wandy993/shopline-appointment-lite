import { createHash } from 'node:crypto';
import { Booking } from '../models/Booking.js';
import { ensureBookingOnlineMeetingSnapshot } from './online-meeting.js';
import { CalendarConnection } from '../models/CalendarConnection.js';
import {
  accessTokenForConnection,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  patchGoogleCalendarEvent
} from './google-calendar.js';
import { incrementOpsUsage, queueHealthEvent } from './ops-hub.js';

const PROVIDER = 'google';
const MAX_BOOKING_MAPPINGS = 100;

function asString(value) { return value == null ? '' : String(value); }
function connectionType(connection) { return connection?.connectionType === 'business' || !connection?.staffId ? 'business' : 'staff'; }
function occurrenceKeyFor(occurrence) { return asString(occurrence.slotKey || `${occurrence.date}T${occurrence.time || ''}`); }

function occurrenceList(booking) {
  const mode = booking.bookingMode || 'slot';
  if (Array.isArray(booking.occurrences) && booking.occurrences.length) {
    return booking.occurrences.map(item => ({
      date: item.date,
      time: mode === 'all_day' ? '' : (item.time || ''),
      slotKey: item.slotKey || `${item.date}T${item.time || ''}`
    }));
  }
  return [{ date: booking.date, time: mode === 'all_day' ? '' : booking.time, slotKey: booking.slotKey || `${booking.date}T${booking.time || ''}` }];
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

export function deterministicGoogleEventId({ bookingId, occurrenceKey, staffId = '', connectionId = '' }) {
  return createHash('sha256')
    .update(`${asString(bookingId)}:${asString(occurrenceKey)}:${asString(staffId)}:${asString(connectionId)}`)
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
  const type = connectionType(connection);
  const occurrenceKey = occurrenceKeyFor(occurrence);
  const inviteCustomer = false;
  const eventIdentity = mode === 'slot' ? 'primary' : occurrenceKey;
  const eventId = deterministicGoogleEventId({ bookingId, occurrenceKey: eventIdentity, staffId: type === 'staff' ? booking.staffId : '', connectionId: connection._id });

  const description = [
    'Appointment Lite booking', '',
    `Customer: ${customerName || 'Customer'}`,
    customerEmail ? `Email: ${customerEmail}` : '',
    customerPhone ? `Phone: ${customerPhone}` : '',
    `Service: ${serviceTitle}`,
    staffName ? `Staff: ${staffName}` : '',
    booking.location ? `Location: ${booking.location}` : '',
    booking.onlineMeeting?.url ? `Meeting: ${booking.onlineMeeting.url}` : '',
    `Booking ID: ${bookingId}`
  ].filter(Boolean).join('\n');

  const event = {
    id: eventId,
    summary: `${serviceTitle}${customerName ? ` · ${customerName}` : ''}`,
    description,
    location: asString(booking.onlineMeeting?.url || booking.location),
    transparency: 'opaque',
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: false,
    extendedProperties: {
      private: {
        appointmentLite: '1', bookingId, occurrenceKey,
        staffId: asString(booking.staffId),
        calendarConnectionId: asString(connection._id),
        calendarConnectionType: type
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
  if (inviteCustomer) event.attendees = [{ email: customerEmail, displayName: customerName || undefined }];
  return { eventId, event, inviteCustomer };
}

function mappingObject(mapping) {
  if (!mapping) return null;
  const value = typeof mapping.toObject === 'function' ? mapping.toObject() : mapping;
  return {
    provider: value.provider || PROVIDER,
    connectionId: value.connectionId || null,
    connectionType: value.connectionType || 'staff',
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
  if (!connection) return { ...existing, status: 'orphaned', lastError: 'Google Calendar connection is no longer available.', lastSyncedAt: new Date() };
  try {
    const accessToken = await accessTokenForConnection(connection);
    await deleteGoogleCalendarEvent({ accessToken, calendarId: existing.calendarId, eventId: existing.eventId, sendUpdates: existing.customerInvited ? 'all' : '' });
    return { ...existing, status: 'deleted', lastError: '', lastSyncedAt: new Date() };
  } catch (error) {
    return { ...existing, status: 'error', lastError: asString(error.message).slice(0, 500), lastSyncedAt: new Date() };
  }
}

function isCurrentMapping(mapping, connection, booking, occurrenceKey) {
  const type = connectionType(connection);
  return asString(mapping.connectionId) === asString(connection._id)
    && asString(mapping.calendarId) === asString(connection.calendarId)
    && asString(mapping.occurrenceKey) === asString(occurrenceKey)
    && (type === 'business' || asString(mapping.staffId) === asString(booking.staffId))
    && mapping.status !== 'deleted';
}

async function upsertMappedEvent({ booking, occurrence, connection, accessToken, existing }) {
  const { eventId, event, inviteCustomer } = buildGoogleCalendarEvent({ booking, occurrence, connection });
  const removingExistingGuest = Boolean(existing?.customerInvited && !inviteCustomer);
  const sendUpdates = existing?.customerInvited || inviteCustomer ? 'all' : '';
  const patch = { ...event };
  delete patch.id;
  if (existing?.customerInvited && inviteCustomer) delete patch.attendees;
  if (removingExistingGuest) patch.attendees = [];

  let result;
  if (existing?.eventId) {
    try {
      result = await patchGoogleCalendarEvent({ accessToken, calendarId: connection.calendarId, eventId: existing.eventId, event: patch, sendUpdates });
    } catch (error) {
      if (![404, 410].includes(Number(error?.providerStatus))) throw error;
    }
  }
  if (!result) {
    try {
      result = await createGoogleCalendarEvent({ accessToken, calendarId: connection.calendarId, event, sendUpdates: inviteCustomer ? 'all' : '' });
    } catch (error) {
      if (Number(error?.providerStatus) !== 409) throw error;
      result = await patchGoogleCalendarEvent({ accessToken, calendarId: connection.calendarId, eventId, event: patch, sendUpdates });
    }
  }

  return {
    provider: PROVIDER,
    connectionId: connection._id,
    connectionType: connectionType(connection),
    staffId: booking.staffId || null,
    calendarId: connection.calendarId,
    occurrenceKey: occurrenceKeyFor(occurrence),
    eventId: result?.id || existing?.eventId || eventId,
    htmlLink: result?.htmlLink || existing?.htmlLink || '',
    customerInvited: Boolean(inviteCustomer),
    status: 'synced', lastError: '', lastSyncedAt: new Date()
  };
}

async function markConnectionSync(connection, error = null) {
  if (!connection?._id) return;
  await CalendarConnection.updateOne({ _id: connection._id }, { $set: { lastSyncAt: new Date(), lastSyncError: error ? asString(error.message || error).slice(0, 500) : '' } }).catch(() => {});
}

function desiredConnectionsForBooking(booking, connections) {
  if (booking.status !== 'confirmed') return [];
  return connections.filter(connection => connection.status === 'connected'
    && connection.calendarId
    && connectionType(connection) === 'business');
}

export async function reconcileBookingGoogleCalendar(bookingId) {
  const foundBooking = await Booking.findById(bookingId);
  if (!foundBooking) return { bookingId: asString(bookingId), skipped: true, reason: 'BOOKING_NOT_FOUND' };
  const booking = await ensureBookingOnlineMeetingSnapshot(foundBooking);

  const connections = await CalendarConnection.find({ shopId: booking.shopId, provider: PROVIDER }).select('+refreshTokenEncrypted');
  const desiredConnections = desiredConnectionsForBooking(booking, connections);
  const desiredIds = new Set(desiredConnections.map(connection => asString(connection._id)));
  const connectionById = new Map(connections.map(connection => [asString(connection._id), connection]));
  const desiredOccurrences = booking.status === 'confirmed' ? occurrenceList(booking) : [];
  const currentKeys = new Set(desiredOccurrences.map(occurrenceKeyFor));
  const mappings = (booking.calendarEvents || []).map(mappingObject).filter(Boolean);
  const retained = [];
  const stale = [];

  for (const mapping of mappings) {
    const connection = connectionById.get(asString(mapping.connectionId));
    if (booking.status !== 'confirmed' || !connection) { stale.push(mapping); continue; }
    const type = connectionType(connection);
    if (type === 'staff' && asString(connection.staffId) !== asString(booking.staffId)) { stale.push(mapping); continue; }
    if (asString(mapping.calendarId) !== asString(connection.calendarId)) { stale.push(mapping); continue; }
    if (!desiredIds.has(asString(connection._id))) { stale.push(mapping); continue; }
    if ((booking.bookingMode || 'slot') !== 'slot' && !currentKeys.has(asString(mapping.occurrenceKey))) { stale.push(mapping); continue; }
    retained.push(mapping);
  }

  const deleted = [];
  for (const mapping of stale) deleted.push(await removeMappedEvent(mapping));

  const synced = [];
  const errors = [];
  for (const connection of desiredConnections) {
    let accessToken;
    let connectionError = null;
    try { accessToken = await accessTokenForConnection(connection); }
    catch (error) {
      connectionError = error;
      errors.push(error);
      await markConnectionSync(connection, error);
      continue;
    }
    for (const occurrence of desiredOccurrences) {
      const key = occurrenceKeyFor(occurrence);
      const existing = (booking.bookingMode || 'slot') === 'slot'
        ? retained.find(mapping => asString(mapping.connectionId) === asString(connection._id) && mapping.status !== 'deleted')
        : retained.find(mapping => isCurrentMapping(mapping, connection, booking, key));
      try { synced.push(await upsertMappedEvent({ booking, occurrence, connection, accessToken, existing })); }
      catch (error) {
        connectionError = connectionError || error;
        const failure = {
          provider: PROVIDER, connectionId: connection._id, connectionType: connectionType(connection), staffId: booking.staffId || null,
          calendarId: connection.calendarId, occurrenceKey: key,
          eventId: existing?.eventId || deterministicGoogleEventId({ bookingId: booking._id, occurrenceKey: (booking.bookingMode || 'slot') === 'slot' ? 'primary' : key, staffId: connectionType(connection) === 'staff' ? booking.staffId : '', connectionId: connection._id }),
          htmlLink: existing?.htmlLink || '', customerInvited: Boolean(existing?.customerInvited),
          status: 'error', lastError: asString(error.message).slice(0, 500), lastSyncedAt: new Date()
        };
        synced.push(failure);
        errors.push(error);
      }
    }
    await markConnectionSync(connection, connectionError);
  }

  const activeKeys = new Set(synced.map(item => `${asString(item.connectionId)}:${asString(item.occurrenceKey)}`));
  const preserved = retained.filter(item => !activeKeys.has(`${asString(item.connectionId)}:${asString(item.occurrenceKey)}`));
  const nextMappings = [...preserved, ...deleted, ...synced].slice(-MAX_BOOKING_MAPPINGS);
  const firstError = synced.find(item => item.status === 'error')?.lastError || deleted.find(item => ['error', 'orphaned'].includes(item.status))?.lastError || (errors[0] ? asString(errors[0].message).slice(0, 500) : '');
  const status = firstError ? 'error' : desiredConnections.length ? 'synced' : 'not_connected';
  await Booking.updateOne({ _id: booking._id }, { $set: { calendarEvents: nextMappings, calendarSyncStatus: status, calendarSyncError: firstError, lastCalendarSyncAt: new Date() } });

  return { bookingId: asString(booking._id), synced: synced.filter(item => item.status === 'synced').length, deleted: deleted.filter(item => item.status === 'deleted').length, errors: errors.length + deleted.filter(item => ['error', 'orphaned'].includes(item.status)).length, skipped: desiredConnections.length === 0 && booking.status === 'confirmed' };
}

const CALENDAR_RETRY_DELAYS_MS = [0, 1500, 5000];

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

export async function reconcileBookingGoogleCalendarWithRetry(bookingId, { reason = 'booking_changed', delays = CALENDAR_RETRY_DELAYS_MS } = {}) {
  let lastResult = null;
  let lastError = null;
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) await wait(delays[attempt]);
    try {
      lastResult = await reconcileBookingGoogleCalendar(bookingId);
      if (!Number(lastResult?.errors || 0)) return { ...lastResult, attempts: attempt + 1 };
      lastError = new Error(`Google Calendar sync reported ${lastResult.errors} error(s).`);
    } catch (error) {
      lastError = error;
    }
  }
  throw Object.assign(lastError || new Error('Google Calendar sync failed.'), { result: lastResult, reason });
}

export function queueBookingGoogleCalendarSync(bookingId, reason = 'booking_changed') {
  if (!bookingId) return;
  setImmediate(async () => {
    const booking = await Booking.findById(bookingId).select('shopId').lean().catch(() => null);
    try {
      await reconcileBookingGoogleCalendarWithRetry(bookingId, { reason });
      if (booking?.shopId) void incrementOpsUsage(booking.shopId, 'external_calendar_syncs', 1);
    } catch (error) {
      if (booking?.shopId) void incrementOpsUsage(booking.shopId, 'external_calendar_failures', 1);
      void queueHealthEvent('google.calendar.sync.failed', {
        shop: booking?.shopId || null, severity: 'error', category: 'calendar',
        message: 'Google Calendar booking synchronization failed after retries.',
        metadata: { bookingId: asString(bookingId), operation: reason, attempts: Number(error?.result?.attempts || CALENDAR_RETRY_DELAYS_MS.length), errorCode: String(error?.code || error?.name || 'GOOGLE_CALENDAR_SYNC_FAILED') }
      });
      console.error(`Google Calendar booking sync failed after retries (${reason})`, asString(error.message || error));
    }
  });
}

async function syncBookingIds(bookings) {
  const summary = { total: bookings.length, synced: 0, deleted: 0, errors: 0, skipped: 0 };
  for (const booking of bookings) {
    try {
      const result = await reconcileBookingGoogleCalendar(booking._id);
      summary.synced += Number(result.synced || 0); summary.deleted += Number(result.deleted || 0); summary.errors += Number(result.errors || 0);
      if (result.skipped) summary.skipped += 1;
    } catch { summary.errors += 1; }
  }
  return summary;
}

export async function syncUpcomingGoogleCalendarBookingsForStaff({ shopId, staffId, limit = 200 }) {
  const today = new Date().toISOString().slice(0, 10);
  const bookings = await Booking.find({ shopId, staffId, status: 'confirmed', date: { $gte: today } }).sort({ date: 1, time: 1 }).limit(Math.max(1, Math.min(500, Number(limit || 200)))).select('_id').lean();
  const summary = await syncBookingIds(bookings);
  if (summary.errors === 0) await CalendarConnection.updateMany({ shopId, staffId, provider: PROVIDER }, { $set: { lastSyncAt: new Date(), lastSyncError: '' } }).catch(() => {});
  return summary;
}

export async function syncUpcomingGoogleCalendarBookingsForBusiness({ shopId, limit = 500 }) {
  const today = new Date().toISOString().slice(0, 10);
  const bookings = await Booking.find({ shopId, status: 'confirmed', date: { $gte: today } }).sort({ date: 1, time: 1 }).limit(Math.max(1, Math.min(1000, Number(limit || 500)))).select('_id').lean();
  const summary = await syncBookingIds(bookings);
  if (summary.errors === 0) await CalendarConnection.updateMany({ shopId, connectionType: 'business', provider: PROVIDER }, { $set: { lastSyncAt: new Date(), lastSyncError: '' } }).catch(() => {});
  return summary;
}

export function queueUpcomingGoogleCalendarBookingsForStaff(values) {
  setImmediate(() => syncUpcomingGoogleCalendarBookingsForStaff(values).catch(error => console.error('Google Calendar staff sync failed', asString(error.message || error))));
}

export function queueUpcomingGoogleCalendarBookingsForBusiness(values) {
  setImmediate(() => syncUpcomingGoogleCalendarBookingsForBusiness(values).catch(error => console.error('Google Calendar business sync failed', asString(error.message || error))));
}
