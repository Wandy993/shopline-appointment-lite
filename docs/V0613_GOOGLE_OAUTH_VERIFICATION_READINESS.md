# Appointment Lite v0.6.13 — Google OAuth Verification Readiness

v0.6.13 prepares Appointment Lite's public website and legal surface for Google OAuth brand verification while keeping the existing Business Google Calendar integration unchanged.

## Public URLs

Production base URL:

- `https://appointment.toolkit.fans/`

Google / App Store-ready pages:

- App homepage: `https://appointment.toolkit.fans/`
- Chinese homepage: `https://appointment.toolkit.fans/zh-cn`
- English privacy policy: `https://appointment.toolkit.fans/en/privacy`
- Chinese privacy policy: `https://appointment.toolkit.fans/zh-cn/privacy`
- English Terms of Service: `https://appointment.toolkit.fans/en/terms`
- Chinese Terms of Service: `https://appointment.toolkit.fans/zh-cn/terms`
- English FAQ: `https://appointment.toolkit.fans/en/faq`
- Chinese FAQ: `https://appointment.toolkit.fans/zh-cn/faq`
- Sitemap: `https://appointment.toolkit.fans/sitemap.xml`
- Robots: `https://appointment.toolkit.fans/robots.txt`

The public pages do not require a SHOPLINE admin session, App Bridge, OAuth session, or `shop` query parameter.

## Google Auth Platform values

Use the following values in Google Auth Platform after the production domain is live:

### Branding

- App name: `Appointment Lite`
- Application homepage: `https://appointment.toolkit.fans/`
- Privacy policy: `https://appointment.toolkit.fans/en/privacy`
- Terms of service: `https://appointment.toolkit.fans/en/terms`
- Authorized domain: `toolkit.fans`

Set a real support email and legal operator in Railway before submitting verification:

```env
LEGAL_OPERATOR_NAME=<your legal operator or developer name>
LEGAL_SUPPORT_EMAIL=<your support email>
```

### OAuth client

OAuth client type: **Web application**

Authorized redirect URI:

```text
https://appointment.toolkit.fans/integrations/google/callback
```

Railway must use the same callback:

```env
APP_URL=https://appointment.toolkit.fans
GOOGLE_CALENDAR_REDIRECT_URI=https://appointment.toolkit.fans/integrations/google/callback
```

### Calendar scopes used by Appointment Lite

Appointment Lite currently requests:

```text
https://www.googleapis.com/auth/calendar.calendarlist.readonly
https://www.googleapis.com/auth/calendar.events.owned
```

The first scope is used to list calendars owned by the connected account so the merchant can select its Business Calendar. The second is used to create, update, and delete appointment events on calendars owned by that account.

Do not add broader Calendar scopes unless a future feature requires them.

## Search Console / domain ownership

Before OAuth verification, verify `toolkit.fans` in Google Search Console using the Google account that owns or edits the Google Cloud project. Domain-property verification normally uses a DNS TXT record.

The OAuth Authorized domain should remain `toolkit.fans`; the production app itself can continue to run on the `appointment.toolkit.fans` subdomain.

## Verification flow

1. Deploy v0.6.13 and confirm every public URL returns `200`.
2. Set the real legal operator and support email in Railway.
3. Verify `toolkit.fans` in Google Search Console.
4. Complete Google Auth Platform Branding with the homepage, privacy, terms, logo, and support email.
5. In Data Access, keep only the Calendar scopes currently used by Appointment Lite.
6. In Clients, set the exact production callback URL.
7. Keep Audience in Testing while validating the end-to-end Business Google Calendar flow with test users.
8. Test: connect Calendar → create booking → edit/reschedule → cancel → confirm event create/update/delete behavior.
9. When the flow is stable, move the app to Production and complete the Verification Center process required for the requested scopes.

## What changed in code

- The root URL is now a real public English product homepage instead of a runtime placeholder.
- `/zh-cn` provides a public Chinese product homepage.
- `/en/terms` and `/zh-cn/terms` provide public Terms of Service.
- The public navigation now includes Home, Privacy, Terms, FAQ, and language switching.
- The homepage explicitly describes Appointment Lite's SHOPLINE scheduling features and Google Calendar data use.
- Privacy / Terms / FAQ are linked directly from the homepage and footer.
- `robots.txt` and `sitemap.xml` expose the public verification pages to crawlers.
- The existing SHOPLINE install behavior remains compatible: root requests with `handle` or `appkey` still enter the SHOPLINE install flow.
- The Google Calendar callback and least-privilege Calendar scope architecture are unchanged.
