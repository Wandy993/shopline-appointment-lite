# Appointment Lite v0.8.14 — Google OAuth Brand Verification Readiness

## Release purpose

This release improves the public website and the in-product privacy disclosure for Google OAuth brand verification. It does not broaden the Google Calendar scopes or add new Google data uses.

## Public identity and contact

- Application name: `Appointment Lite`
- Production homepage: https://appointment.shoplineapp.vip/
- Privacy policy: https://appointment.shoplineapp.vip/en/privacy
- Terms of service: https://appointment.shoplineapp.vip/en/terms
- Support and privacy requests: help@appointment.vip
- Authorized domain: `shoplineapp.vip`
- Google OAuth callback: https://appointment.shoplineapp.vip/integrations/google/callback

The public homepage identifies Appointment Lite in its main heading, describes the scheduling product, links to the privacy policy and terms, and is served without requiring a merchant login. SHOPLINE installation requests that include `handle` or `appkey` continue to use the existing install route.

## Google Calendar scopes and actual use

Appointment Lite requests only:

- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
- `https://www.googleapis.com/auth/calendar.events.owned`

The calendar-list scope retrieves calendars owned by the connected Google account, including calendar ID, display name, primary-calendar status, and time zone.

The events scope is used by the current implementation to create, update, and delete Appointment Lite booking events in the merchant-selected calendar. The current implementation does not call Google Calendar API methods to list, search, or read existing event contents.

A synchronized event may include:

- Service title.
- Appointment date, time, and time zone.
- Customer name, email, and phone number when provided.
- Staff name.
- Service location.
- Online meeting URL when configured.
- Booking reference.

These details may appear in the event title, description, or location. The current integration does not add customers as event attendees or send Google Calendar invitations.

## Storage, security, and disconnection

- The Google OAuth refresh token is encrypted with AES-256-GCM before it is stored in the application database.
- Short-lived access tokens are used for Google API requests and are not stored as persistent database records.
- The app stores the selected calendar ID, display name, time zone, granted scope names, event IDs, and synchronization status associated with booking records.
- When a merchant disconnects Google Calendar, Appointment Lite requests token revocation and deletes the local calendar connection, including the stored refresh token.
- Disconnecting does not automatically delete events already created in Google Calendar. Those events remain in the merchant's Google Calendar until the merchant deletes them there.
- When a booking is cancelled or removed while the connection is active, the synchronization process may delete its corresponding event.

## Google API Services User Data Policy

Appointment Lite uses Google Calendar data only to provide the merchant-requested appointment synchronization feature. It does not sell Google user data, use it for advertising, or use it to train generalized AI or machine-learning models.

The public homepage and privacy policy state that Appointment Lite's access, use, storage, and transfer of Google user data follow the Google API Services User Data Policy, including its Limited Use requirements.

The homepage also states that Appointment Lite does not use Google APIs to create, generate, store, distribute, or facilitate AI-generated non-consensual intimate imagery (NCII).

Policy reference: https://developers.google.com/terms/api-services-user-data-policy

## In-product privacy disclosure

The Google Calendar settings view displays a privacy notice before the merchant connects or reconnects a calendar. It summarizes:

- Calendar-list access and appointment event synchronization.
- The types of booking details that may be included in calendar events.
- Refresh-token encryption.
- The effect of disconnecting.
- A direct link to the Google Calendar section of the public privacy policy.

## Required Google Console actions

These actions require a project owner/editor and must be completed in Google Search Console / Google Auth Platform; they are not performed by this code release.

1. In Google Search Console, add the Domain property `shoplineapp.vip`.
2. Add the TXT record Google provides to the Cloudflare DNS zone for `shoplineapp.vip`.
3. Verify ownership using a Google Account that is an Owner or Editor of the Google Cloud project `appointment-lite-506707`.
4. Allow Google's systems time to recognize the verification. The brand verification issue screen may require waiting up to 24 hours before retrying.
5. In Google Auth Platform > Branding, confirm:
   - App name: `Appointment Lite`
   - Homepage: https://appointment.shoplineapp.vip/
   - Privacy policy: https://appointment.shoplineapp.vip/en/privacy
   - Terms: https://appointment.shoplineapp.vip/en/terms
   - Authorized domain: `shoplineapp.vip`
   - User support email: `help@appointment.vip`, if Google offers it as a selectable verified support address.
   - Developer contact email: a monitored address.
6. In Google Auth Platform > Clients, ensure the OAuth web client has the exact redirect URI:
   `https://appointment.shoplineapp.vip/integrations/google/callback`
7. In Google Auth Platform > Data Access, retain only the two scopes listed above unless a future feature has a documented need for another scope.
8. Re-run brand verification. After verification succeeds, publish the Draft Branding so the updated branding becomes active.

## Release verification checklist

- [ ] `/` returns HTTP 200 without a SHOPLINE session.
- [ ] `/en/privacy`, `/zh-cn/privacy`, `/en/terms`, and `/zh-cn/terms` return HTTP 200.
- [ ] Homepage clearly displays the name Appointment Lite and explains the product.
- [ ] Homepage links to the same privacy policy URL configured in Google Auth Platform.
- [ ] Homepage and privacy policy include the Google API Limited Use disclosure.
- [ ] Google Calendar in-product privacy notice is visible before authorization.
- [ ] `help@appointment.vip` appears on the homepage and both privacy policy language versions.
- [ ] Google Search Console domain ownership is verified.
- [ ] Google OAuth callback and Google Auth Platform branding match the production domain.
- [ ] Merchant Google Calendar connect, sync, disconnect, and reconnect flows are regression-tested.
