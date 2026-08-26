import crypto from 'node:crypto';
import { config } from '../config.js';
import { readSignedPayload, signPayload } from '../lib/signature.js';
import { decryptSecret, encryptSecret, isValidSecretKeyMaterial } from '../lib/secret-box.js';

export const GOOGLE_CALENDAR_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.owned'
]);

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_LIST_ENDPOINT = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';

function providerError(message, status = 502, code = 'GOOGLE_CALENDAR_ERROR') {
  return Object.assign(new Error(message), { status, code });
}

async function readJson(response, message) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.error_description || payload.error?.message || payload.error || '';
    const error = providerError(detail ? `${message}: ${detail}` : message, response.status === 400 ? 400 : 502);
    error.providerStatus = response.status;
    throw error;
  }
  return payload;
}

export function googleCalendarConfigured() {
  return Boolean(
    config.googleCalendar.clientId &&
    config.googleCalendar.clientSecret &&
    config.googleCalendar.redirectUri &&
    isValidSecretKeyMaterial(config.googleCalendar.tokenEncryptionKey)
  );
}

export function buildGoogleAuthorizationUrl({ clientId, redirectUri, scopes = GOOGLE_CALENDAR_SCOPES, state }) {
  const target = new URL(AUTH_ENDPOINT);
  target.searchParams.set('client_id', clientId);
  target.searchParams.set('redirect_uri', redirectUri);
  target.searchParams.set('response_type', 'code');
  target.searchParams.set('access_type', 'offline');
  target.searchParams.set('include_granted_scopes', 'true');
  target.searchParams.set('prompt', 'consent');
  target.searchParams.set('scope', scopes.join(' '));
  target.searchParams.set('state', state);
  return target.toString();
}

export function createGoogleCalendarState({ shopId, staffId }) {
  return signPayload({
    type: 'google_calendar',
    shopId: String(shopId),
    staffId: String(staffId),
    nonce: crypto.randomUUID(),
    exp: Date.now() + 10 * 60 * 1000
  }, config.sessionSecret);
}

export function readGoogleCalendarState(value) {
  const payload = readSignedPayload(value, config.sessionSecret);
  if (!payload || payload.type !== 'google_calendar' || payload.exp < Date.now() || !payload.shopId || !payload.staffId) return null;
  return payload;
}

export function googleCalendarAuthorizationUrl({ shopId, staffId }) {
  if (!googleCalendarConfigured()) throw providerError('Google Calendar is not configured for this Appointment Lite deployment.', 503, 'GOOGLE_CALENDAR_NOT_CONFIGURED');
  return buildGoogleAuthorizationUrl({
    clientId: config.googleCalendar.clientId,
    redirectUri: config.googleCalendar.redirectUri,
    scopes: GOOGLE_CALENDAR_SCOPES,
    state: createGoogleCalendarState({ shopId, staffId })
  });
}

export async function exchangeGoogleAuthorizationCode(code) {
  const body = new URLSearchParams({
    code: String(code || ''),
    client_id: config.googleCalendar.clientId,
    client_secret: config.googleCalendar.clientSecret,
    redirect_uri: config.googleCalendar.redirectUri,
    grant_type: 'authorization_code'
  });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  return readJson(response, 'Google OAuth token exchange failed');
}

export async function refreshGoogleAccessToken(refreshToken) {
  const body = new URLSearchParams({
    refresh_token: String(refreshToken || ''),
    client_id: config.googleCalendar.clientId,
    client_secret: config.googleCalendar.clientSecret,
    grant_type: 'refresh_token'
  });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  return readJson(response, 'Google OAuth token refresh failed');
}

export async function listOwnedGoogleCalendars(accessToken) {
  const target = new URL(CALENDAR_LIST_ENDPOINT);
  target.searchParams.set('maxResults', '250');
  target.searchParams.set('minAccessRole', 'owner');
  const response = await fetch(target, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await readJson(response, 'Could not load Google calendars');
  return (payload.items || [])
    .filter(item => item?.id && item.accessRole === 'owner')
    .map(item => ({
      id: String(item.id),
      summary: String(item.summary || item.id),
      primary: Boolean(item.primary),
      timeZone: String(item.timeZone || ''),
      accessRole: String(item.accessRole || '')
    }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || a.summary.localeCompare(b.summary));
}

export function encryptGoogleRefreshToken(refreshToken) {
  return encryptSecret(refreshToken, config.googleCalendar.tokenEncryptionKey);
}

export function decryptGoogleRefreshToken(value) {
  return decryptSecret(value, config.googleCalendar.tokenEncryptionKey);
}

export async function accessTokenForConnection(connection) {
  const refreshToken = decryptGoogleRefreshToken(connection.refreshTokenEncrypted);
  const token = await refreshGoogleAccessToken(refreshToken);
  if (!token.access_token) throw providerError('Google did not return an access token.', 502);
  return token.access_token;
}

export async function revokeGoogleRefreshToken(refreshToken) {
  if (!refreshToken) return false;
  const response = await fetch(REVOKE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken })
  });
  return response.ok;
}

export function publicConnection(connection) {
  if (!connection) return null;
  return {
    id: String(connection._id),
    staffId: String(connection.staffId),
    provider: connection.provider,
    accountLabel: connection.accountLabel || '',
    calendarId: connection.calendarId || '',
    calendarName: connection.calendarName || '',
    calendarTimeZone: connection.calendarTimeZone || '',
    status: connection.status || 'connected',
    connectedAt: connection.connectedAt || connection.createdAt || null,
    lastVerifiedAt: connection.lastVerifiedAt || null,
    lastError: connection.lastError || ''
  };
}
