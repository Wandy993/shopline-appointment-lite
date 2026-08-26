# Google Calendar architecture

Appointment Lite v0.6.0.2 treats Google Calendar as an optional scheduling integration, not as the notification identity for the whole product. Email notifications and customer calendar links keep working even when no Google account is connected.

## Recommended model: one Business Calendar

The merchant can connect one Google account from **Calendar Sync → Business Calendar** and choose a calendar that account owns. When **Sync appointments** is enabled, every confirmed store booking is created or updated in that calendar. Cancellation removes the mapped Google event. Staff reassignment updates the business event instead of requiring the assigned staff member to authorize Google.

This is the default fit for SHOPLINE stores where one admin manages employees, installers, technicians, consultants, or external teams.

## Optional Personal Staff Calendars

A staff member may still have a separate Google connection. It creates a second copy of that staff member's assigned appointments. This connection is optional and is not required for:

- receiving assignment emails;
- appearing in Staff scheduling;
- accepting customer bookings;
- using the store-wide Business Calendar.

Personal connections remain useful when a merchant explicitly wants a staff member to keep an additional personal Google calendar copy. Google busy-time conflict reading is not part of v0.6.0.2.

## Customer calendar experience

Customer Google guest invitations are **off by default**. The default customer flow is the Appointment Lite confirmation email plus:

- **Add to Google Calendar** — opens a prefilled Google Calendar template for single-slot/all-day bookings;
- **Apple / Outlook / Other (.ics)** — downloads a standards-based calendar file and also supports multi-session bookings.

A merchant may enable **Send Google invitations to customers** on a Google connection. When enabled, Appointment Lite adds the booking email as a Google event attendee and uses `sendUpdates=all`. Google may show an unknown-sender warning for first-contact invitations; this behavior is controlled by Google, so Appointment Lite recommends the branded Add-to-Calendar flow instead.

## Event synchronization

For active Google connections, Appointment Lite reconciles events after:

- booking creation;
- customer reschedule;
- merchant date/time/location edit;
- staff reassignment;
- customer or merchant cancellation.

Business and personal connections use deterministic event IDs and private extended properties for retry-safe updates. Booking creation remains authoritative: a temporary Google API failure does not roll back the Appointment Lite booking. Sync health is stored on the booking and connection and can be retried with **Sync now**.

## Existing v0.6.0 / v0.6.0.1 connections

Existing per-staff Google connections are migrated to `connectionType=staff` and remain optional personal calendars. The architecture migration sets `sendCustomerInvites=false` once for older connections so customers move to the branded Appointment Lite calendar-link flow by default.

## Google Cloud configuration

The existing v0.6.0 OAuth configuration remains valid. Enable Google Calendar API and use a Web application OAuth client with:

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

OAuth scopes remain:

```text
https://www.googleapis.com/auth/calendar.calendarlist.readonly
https://www.googleapis.com/auth/calendar.events.owned
```

Only calendars reported by Google with owner access are selectable.

## Product access

Appointment Lite v0.6.0.2 contains no Free/Pro calendar feature gate. Business Calendar, optional personal calendars, customer calendar links, and email notification architecture are product capabilities for installed stores.

## Not included yet

- Google Calendar busy-time → Appointment Lite availability blocking
- Google incremental sync / push notifications
- Staff self-service calendar connection links outside SHOPLINE Admin
- Outlook/Microsoft Graph server-side calendar synchronization
