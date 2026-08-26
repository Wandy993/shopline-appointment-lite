# Google Calendar Sync

Appointment Lite v0.6.0.1 activates **Appointment → Google Calendar** synchronization on top of the per-staff OAuth foundation introduced in v0.6.0.

Appointment Lite remains the booking source of truth. Google Calendar is a staff calendar projection plus an optional customer invitation channel.

## What v0.6.0.1 does

For every active staff member with a connected Google Calendar and **Sync appointments** enabled:

- New confirmed Appointment Lite bookings create Google Calendar events.
- Customer online reschedules update the existing Google event instead of creating a replacement event.
- Merchant date/time/location updates update the Google event.
- Staff reassignment removes the old staff event and creates the event on the newly assigned staff member's connected calendar when available.
- Customer or merchant cancellation deletes the Google event.
- Multi-session bookings create one Google event per occurrence.
- All-day bookings create Google all-day events with an exclusive end date.
- Event mappings are stored on the Appointment Lite booking so retries are idempotent and lifecycle changes can reconcile the correct Google event.

The Calendar Sync workspace also adds **Sync now**, which backfills/upserts upcoming confirmed bookings for that staff member. This is especially useful for connections created before v0.6.0.1.

## Customer invitations

Each Google connection has a **Send customer calendar invitations** switch. It is enabled by default in v0.6.0.1.

When enabled:

- the booking email is added to the Google event as an attendee;
- event creation uses `sendUpdates=all` so Google can deliver an invitation;
- reschedules/merchant updates propagate calendar updates to already-invited customers;
- cancellations use `sendUpdates=all` so Google can deliver cancellation updates.

A customer does not need a Gmail address to be added as an attendee. Delivery and automatic calendar insertion still depend on the recipient's mail/calendar provider and Google/Workspace policies.

Turning customer invitations off prevents new Appointment Lite-created Google events from adding the customer as a guest. It does not silently remove a customer who was already invited to an existing Google event.

## Event identity and retry safety

Single-slot bookings use a deterministic Google event ID based on the Appointment Lite booking and assigned staff member. A reschedule therefore updates the same event identity.

Multi-session/all-day occurrences use occurrence-aware deterministic event IDs. If a create request is retried and Google reports that the deterministic ID already exists, Appointment Lite patches the existing event instead of creating a duplicate.

Every event also receives private extended properties:

- `appointmentLite=1`
- `bookingId`
- `occurrenceKey`
- `staffId`
- `calendarConnectionId`

These identifiers are reserved for Appointment Lite reconciliation and future busy-time filtering.

## Stored sync state

`CalendarConnection` stores:

- `syncAppointments`
- `sendCustomerInvites`
- `lastSyncAt`
- `lastSyncError`

`Booking` stores Google event mappings and high-level sync health:

- `calendarEvents[]`
- `calendarSyncStatus`
- `calendarSyncError`
- `lastCalendarSyncAt`

The encrypted refresh token remains `select:false` and is decrypted only for server-side Google API calls.

## Existing v0.6.0 connections

On deployment, the database compatibility pass enables `syncAppointments` and `sendCustomerInvites` for existing Google connections that predate these fields.

After upgrading from v0.6.0, open **Calendar Sync** and click **Sync now** for an already-connected staff member to sync existing upcoming bookings immediately. New bookings sync automatically.

## Google Cloud setup

The v0.6.0 configuration remains valid. No new scope is required.

Enable **Google Calendar API**, create a Web application OAuth client, and keep this redirect URI aligned with Railway:

```text
https://appointment.toolkit.fans/integrations/google/callback
```

Railway variables:

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

## OAuth scopes

v0.6.0.1 continues to request only:

```text
https://www.googleapis.com/auth/calendar.calendarlist.readonly
https://www.googleapis.com/auth/calendar.events.owned
```

Calendar selection remains restricted to calendars where Google reports `accessRole=owner`.

## Disconnect and pause behavior

- Turning **Sync appointments** off pauses future Google changes; existing Google events remain in place.
- Disconnecting revokes/deletes the stored Google authorization on a best-effort basis; existing Google events are not removed automatically.
- Reassigning a booking to another staff member still attempts to remove the old staff event before syncing to the new staff calendar.

## Not included yet

v0.6.0.1 does **not** read Google Calendar events as staff busy time. Google → Appointment Lite conflict blocking, incremental sync, and push notifications remain the next calendar milestone.
