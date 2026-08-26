import { Router } from 'express';
import { CalendarConnection } from '../models/CalendarConnection.js';
import { Shop } from '../models/Shop.js';
import { Staff } from '../models/Staff.js';
import {
  GOOGLE_CALENDAR_SCOPES,
  encryptGoogleRefreshToken,
  exchangeGoogleAuthorizationCode,
  listOwnedGoogleCalendars,
  readGoogleCalendarState
} from '../services/google-calendar.js';
import { queueUpcomingGoogleCalendarBookingsForStaff } from '../services/calendar-sync.js';

export const integrationsRouter = Router();

function completeUrl(status, values = {}) {
  const params = new URLSearchParams({ status, ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? '')])) });
  return `/integrations/google/complete?${params}`;
}

integrationsRouter.get('/google/callback', async (req, res) => {
  const state = readGoogleCalendarState(req.query.state);
  if (!state) return res.redirect(completeUrl('error', { message: 'Google Calendar connection expired. Reopen Appointment Lite and try again.' }));
  if (req.query.error) return res.redirect(completeUrl('error', { staffId: state.staffId, message: 'Google Calendar permission was not granted.' }));
  if (!req.query.code) return res.redirect(completeUrl('error', { staffId: state.staffId, message: 'Google did not return an authorization code.' }));

  try {
    const [shop, staff] = await Promise.all([
      Shop.findOne({ _id: state.shopId, uninstalledAt: null }).select('_id'),
      Staff.findOne({ _id: state.staffId, shopId: state.shopId }).select('_id name email')
    ]);
    if (!shop || !staff) return res.redirect(completeUrl('error', { message: 'The Appointment Lite staff connection is no longer available.' }));

    const tokens = await exchangeGoogleAuthorizationCode(req.query.code);
    if (!tokens.access_token) throw new Error('Google did not return an access token.');

    const existing = await CalendarConnection.findOne({ shopId: shop._id, staffId: staff._id, provider: 'google' }).select('+refreshTokenEncrypted');
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptGoogleRefreshToken(tokens.refresh_token)
      : existing?.refreshTokenEncrypted;
    if (!encryptedRefreshToken) throw new Error('Google did not return an offline refresh token. Please connect again and approve access.');

    const calendars = await listOwnedGoogleCalendars(tokens.access_token);
    if (!calendars.length) throw new Error('No Google Calendar owned by this account is available.');
    const selected = calendars.find(item => item.id === existing?.calendarId) || calendars.find(item => item.primary) || calendars[0];
    const primary = calendars.find(item => item.primary);
    const scopes = String(tokens.scope || '').split(/\s+/).filter(Boolean);

    const connection = await CalendarConnection.findOneAndUpdate(
      { shopId: shop._id, staffId: staff._id, provider: 'google' },
      {
        $set: {
          accountLabel: primary?.id || primary?.summary || selected.id,
          calendarId: selected.id,
          calendarName: selected.summary,
          calendarTimeZone: selected.timeZone,
          refreshTokenEncrypted: encryptedRefreshToken,
          scopes: scopes.length ? scopes : GOOGLE_CALENDAR_SCOPES,
          syncAppointments: existing?.syncAppointments !== false,
          sendCustomerInvites: existing?.sendCustomerInvites !== false,
          status: 'connected',
          lastError: '',
          connectedAt: existing?.connectedAt || new Date(),
          lastVerifiedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    if (connection.syncAppointments !== false) queueUpcomingGoogleCalendarBookingsForStaff({ shopId: shop._id, staffId: staff._id });
    res.redirect(completeUrl('connected', { staffId: staff._id, staffName: staff.name, calendar: selected.summary }));
  } catch (error) {
    console.warn('Google Calendar OAuth callback failed:', error.message);
    res.redirect(completeUrl('error', { staffId: state.staffId, message: 'Could not connect Google Calendar. Please try again.' }));
  }
});

integrationsRouter.get('/google/complete', (req, res) => {
  const status = req.query.status === 'connected' ? 'connected' : 'error';
  const message = status === 'connected'
    ? `Google Calendar connected${req.query.calendar ? `: ${req.query.calendar}` : ''}. You can close this window.`
    : String(req.query.message || 'Could not connect Google Calendar.');
  const payload = JSON.stringify({
    type: 'appointment-lite:google-calendar',
    status,
    staffId: String(req.query.staffId || ''),
    message
  }).replace(/</g, '\\u003c');
  res.set('Cache-Control', 'no-store').type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Calendar · Appointment Lite</title><link rel="stylesheet" href="/integration-assets/google-complete.css"></head>
<body data-google-result='${payload.replace(/'/g, '&#39;')}'><main><div class="calendar-mark">G</div><h1>${status === 'connected' ? 'Google Calendar connected' : 'Connection not completed'}</h1><p>${message.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])}</p><button id="closeWindow" type="button">Close window</button></main><script src="/integration-assets/google-complete.js"></script></body></html>`);
});
