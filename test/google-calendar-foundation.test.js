import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildGoogleAuthorizationUrl, GOOGLE_CALENDAR_SCOPES } from '../src/services/google-calendar.js';
import { decryptSecret, encryptSecret } from '../src/lib/secret-box.js';
import { CalendarConnection } from '../src/models/CalendarConnection.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Google Calendar OAuth foundation requests offline owned-calendar access', () => {
  const url = new URL(buildGoogleAuthorizationUrl({
    clientId: 'client-id.apps.googleusercontent.com',
    redirectUri: 'https://appointment.example.com/integrations/google/callback',
    state: 'signed-state'
  }));
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('prompt'), 'consent');
  assert.equal(url.searchParams.get('include_granted_scopes'), 'true');
  assert.equal(url.searchParams.get('state'), 'signed-state');
  const scopes = new Set(String(url.searchParams.get('scope')).split(' '));
  for (const scope of GOOGLE_CALENDAR_SCOPES) assert.ok(scopes.has(scope));
  assert.ok(scopes.has('https://www.googleapis.com/auth/calendar.calendarlist.readonly'));
  assert.ok(scopes.has('https://www.googleapis.com/auth/calendar.events.owned'));
});

test('Google refresh tokens are encrypted with authenticated AES-256-GCM storage', () => {
  const key = 'f'.repeat(64);
  const secret = 'refresh-token-value';
  const encrypted = encryptSecret(secret, key);
  assert.match(encrypted, /^v1\./);
  assert.doesNotMatch(encrypted, /refresh-token-value/);
  assert.equal(decryptSecret(encrypted, key), secret);
  assert.throws(() => decryptSecret(encrypted, 'e'.repeat(64)));
});

test('CalendarConnection keeps one Google connection per staff member and hides refresh tokens by default', () => {
  const indexes = CalendarConnection.schema.indexes();
  assert.ok(indexes.some(([keys, options]) => keys.shopId === 1 && keys.staffId === 1 && keys.provider === 1 && options.unique === true));
  assert.equal(CalendarConnection.schema.path('refreshTokenEncrypted').options.select, false);
});

test('admin exposes merchant Business Calendar UI and Google connection management endpoints', async () => {
  const [view, asset, routes, integrationRoutes, styles, config, env] = await Promise.all([
    read('../src/views/admin.js'), read('../public/admin/app.js'), read('../src/routes/admin.js'), read('../src/routes/integrations.js'), read('../public/admin/styles.css'), read('../src/config.js'), read('../.env.example')
  ]);
  assert.match(view, /navButton\('calendar', 'Calendar Sync'/);
  assert.match(view, /id="calendarView"/);
  assert.match(view, /id="calendarDialog"/);
  assert.match(view, /Business appointment calendar/);
  assert.doesNotMatch(view, /PERSONAL STAFF CALENDARS/);
  assert.match(asset, /function connectGoogleCalendar/);
  assert.match(asset, /appointment-lite:google-calendar/);
  assert.match(routes, /\/calendar\/google\/store\/connect/);
  assert.match(routes, /STAFF_GOOGLE_CALENDAR_RETIRED/);
  assert.match(routes, /decryptGoogleRefreshToken/);
  assert.match(integrationRoutes, /\/google\/callback/);
  assert.match(integrationRoutes, /exchangeGoogleAuthorizationCode/);
  assert.match(styles, /\.calendar-business-card\{/);
  assert.match(config, /GOOGLE_CALENDAR_CLIENT_ID/);
  assert.match(env, /GOOGLE_TOKEN_ENCRYPTION_KEY/);
});
