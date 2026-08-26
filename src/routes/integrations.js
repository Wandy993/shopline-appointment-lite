import { Router } from 'express';
import { CalendarConnection } from '../models/CalendarConnection.js';
import { Shop } from '../models/Shop.js';
import {
  GOOGLE_CALENDAR_SCOPES,
  encryptGoogleRefreshToken,
  exchangeGoogleAuthorizationCode,
  listOwnedGoogleCalendars,
  readGoogleCalendarState
} from '../services/google-calendar.js';
import { queueUpcomingGoogleCalendarBookingsForBusiness } from '../services/calendar-sync.js';

export const integrationsRouter = Router();

function completeUrl(status, values = {}) {
  const params = new URLSearchParams({ status, ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? '')])) });
  return `/integrations/google/complete?${params}`;
}

integrationsRouter.get('/google/callback', async (req, res) => {
  const state = readGoogleCalendarState(req.query.state);
  if (!state) return res.redirect(completeUrl('error', { message: 'Google Calendar connection expired. Reopen Appointment Lite and try again.' }));
  if (req.query.error) return res.redirect(completeUrl('error', { connectionType: state.connectionType, staffId: state.staffId || '', message: 'Google Calendar permission was not granted.' }));
  if (!req.query.code) return res.redirect(completeUrl('error', { connectionType: state.connectionType, staffId: state.staffId || '', message: 'Google did not return an authorization code.' }));
  if (state.connectionType !== 'business') return res.redirect(completeUrl('error', { connectionType: 'business', message: 'Personal staff calendar connections are no longer used. Connect the Business Google Calendar from Appointment Lite.' }));

  try {
    const shop = await Shop.findOne({ _id: state.shopId, uninstalledAt: null }).select('_id');
    if (!shop) return res.redirect(completeUrl('error', { message: 'The Appointment Lite store connection is no longer available.' }));

    const tokens = await exchangeGoogleAuthorizationCode(req.query.code);
    if (!tokens.access_token) throw new Error('Google did not return an access token.');

    const filter = { shopId: shop._id, provider: 'google', connectionType: 'business', staffId: null };
    const existing = await CalendarConnection.findOne(filter).select('+refreshTokenEncrypted');
    const encryptedRefreshToken = tokens.refresh_token ? encryptGoogleRefreshToken(tokens.refresh_token) : existing?.refreshTokenEncrypted;
    if (!encryptedRefreshToken) throw new Error('Google did not return an offline refresh token. Please connect again and approve access.');

    const calendars = await listOwnedGoogleCalendars(tokens.access_token);
    if (!calendars.length) throw new Error('No Google Calendar owned by this account is available.');
    const selected = calendars.find(item => item.id === existing?.calendarId) || calendars.find(item => item.primary) || calendars[0];
    const primary = calendars.find(item => item.primary);
    const scopes = String(tokens.scope || '').split(/\s+/).filter(Boolean);

    const connection = await CalendarConnection.findOneAndUpdate(
      filter,
      {
        $set: {
          connectionType: 'business', staffId: null,
          accountLabel: primary?.id || primary?.summary || selected.id,
          calendarId: selected.id, calendarName: selected.summary, calendarTimeZone: selected.timeZone,
          refreshTokenEncrypted: encryptedRefreshToken,
          scopes: scopes.length ? scopes : GOOGLE_CALENDAR_SCOPES,
          syncAppointments: true, sendCustomerInvites: false,
          architectureVersion: 'business-calendar-v3', status: 'connected', lastError: '',
          connectedAt: existing?.connectedAt || new Date(), lastVerifiedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    queueUpcomingGoogleCalendarBookingsForBusiness({ shopId: shop._id });
    res.redirect(completeUrl('connected', { connectionType: 'business', calendar: selected.summary }));
  } catch (error) {
    console.warn('Google Calendar OAuth callback failed:', error.message);
    res.redirect(completeUrl('error', { connectionType: state.connectionType, staffId: state.staffId || '', message: 'Could not connect Google Calendar. Please try again.' }));
  }
});

integrationsRouter.get('/google/complete', (req, res) => {
  const status = req.query.status === 'connected' ? 'connected' : 'error';
  const connectionType = req.query.connectionType === 'business' ? 'business' : 'staff';
  const message = status === 'connected'
    ? `${connectionType === 'business' ? 'Business Google Calendar' : 'Google Calendar'} connected${req.query.calendar ? `: ${req.query.calendar}` : ''}. You can close this window.`
    : String(req.query.message || 'Could not connect Google Calendar.');
  const payload = JSON.stringify({
    type: 'appointment-lite:google-calendar', status, connectionType,
    staffId: String(req.query.staffId || ''), message
  }).replace(/</g, '\\u003c');
  res.set('Cache-Control', 'no-store').type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Calendar · Appointment Lite</title><link rel="stylesheet" href="/integration-assets/google-complete.css"></head>
<body data-google-result='${payload.replace(/'/g, '&#39;')}'><main><div class="calendar-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.24-.2-1.8H12v3.28h5.52a4.72 4.72 0 0 1-2.05 3.01l-.02.11 2.98 2.31.21.02c1.93-1.78 3.04-4.4 3.04-6.93Z"/><path fill="#34A853" d="M12 22c2.76 0 5.08-.91 6.78-2.48l-3.23-2.5c-.86.6-2.04 1.01-3.55 1.01a6.17 6.17 0 0 1-5.83-4.26l-.1.01-3.1 2.4-.04.1A10.24 10.24 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.17 13.77A6.3 6.3 0 0 1 5.83 12c0-.62.12-1.22.33-1.78l-.01-.12-3.14-2.44-.1.05A10 10 0 0 0 1.82 12c0 1.55.38 3.02 1.08 4.29l3.27-2.52Z"/><path fill="#EA4335" d="M12 5.97c1.92 0 3.22.83 3.97 1.52l2.88-2.81C17.08 3.03 14.76 2 12 2a10.24 10.24 0 0 0-9.08 5.71l3.24 2.51A6.19 6.19 0 0 1 12 5.97Z"/></svg></div><h1>${status === 'connected' ? 'Google Calendar connected' : 'Connection not completed'}</h1><p>${message.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])}</p><button id="closeWindow" type="button">Close window</button></main><script src="/integration-assets/google-complete.js"></script></body></html>`);
});
