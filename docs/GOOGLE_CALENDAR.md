# Google Calendar Foundation

Appointment Lite v0.6.0 introduces the connection and credential foundation for per-staff Google Calendar synchronization. It intentionally stops before appointment event writes or Google busy-time conflict blocking.

## What v0.6.0 does

For each active managed staff member, the merchant can:

1. Open **Calendar Sync** in Appointment Lite Admin.
2. Connect a Google account through OAuth 2.0.
3. Choose one Google Calendar owned by that account.
4. Reconnect the account, change the selected calendar, or disconnect it.
5. See connection health and the selected calendar/time zone.

The OAuth callback is public but protected by a short-lived signed state containing the Appointment Lite store/staff identity. The merchant-admin endpoints remain behind the existing signed Appointment Lite admin session and CSRF protection.

## Google Cloud setup

1. Create or select a Google Cloud project.
2. Enable **Google Calendar API**.
3. Configure the OAuth consent screen. During development/testing, add the Google accounts that should be allowed as test users when the consent configuration requires them.
4. Create an OAuth Client ID of type **Web application**.
5. Add this authorized redirect URI exactly:

```text
https://appointment.toolkit.fans/integrations/google/callback
```

If `APP_URL` changes, use `<APP_URL>/integrations/google/callback` instead and keep the Railway variable and Google Cloud authorized redirect URI identical.

## Railway variables

```dotenv
GOOGLE_CALENDAR_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=YOUR_WEB_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI=https://appointment.toolkit.fans/integrations/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=64_HEX_CHARACTERS
```

Generate the encryption key on macOS:

```bash
openssl rand -hex 32
```

Do not put Google credentials or the token-encryption key into Theme App Extension files or browser JavaScript.

## OAuth scopes

v0.6.0 requests only:

```text
https://www.googleapis.com/auth/calendar.calendarlist.readonly
https://www.googleapis.com/auth/calendar.events.owned
```

Calendar selection is therefore restricted to calendars where Google reports `accessRole=owner`. This keeps the future event-write permission aligned with the calendars that Appointment Lite allows the merchant to select.

The authorization request uses offline access so the backend can obtain a refresh token for future booking lifecycle synchronization. Google access tokens are refreshed server-side when Calendar Sync needs to verify/list calendars.

## Stored data

A `CalendarConnection` document stores:

- Appointment Lite `shopId` and `staffId`
- provider (`google`)
- selected Google calendar ID, display name, and time zone
- non-secret account label
- granted scope list
- connection status/error timestamps
- AES-256-GCM encrypted refresh token

The schema marks the refresh-token field `select:false`, so ordinary queries do not return it. A unique index allows one Google connection per store/staff/provider combination.

## Disconnect behavior

Disconnect attempts to revoke the stored Google refresh token. A Google revocation/network failure does not trap the merchant in a connected state: Appointment Lite logs the warning and still deletes the local credential record.

## Explicitly not included yet

Foundation does not yet:

- create Google Calendar events after a booking
- update/delete Google events on reschedule/cancel
- read Google events as staff busy time
- use push notifications or incremental sync tokens
- send Google invitations to customers

Those behaviors should be added after the connection foundation is proven stable. Appointment Lite remains the source of truth for booking, capacity, staff-reservation, and customer-notification rules.
