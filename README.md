# Appointment Lite for SHOPLINE

Version `0.2.1` — Aliyun DirectMail/Resend email delivery and email-client-compatible cross-device appointment management, based on the `appointment-lite-v0.1.0-mvp` foundation.

Appointment Lite turns selected SHOPLINE products into appointment or consultation services. It is designed for wedding fittings, jewelry consultations, furniture consultations, beauty services, classes, and made-to-order products.

## MVP status

Implemented:

- SHOPLINE OAuth installation, signed callback verification, token persistence, and refresh structure.
- Admin overview, rule CRUD, SHOPLINE product selection, booking list, editing, and cancellation.
- Duration, buffer, available date range, weekday schedule, daily windows, text-only location/staff, enabled state, notes prompt, and up to five custom questions.
- Public rule/availability APIs and booking creation.
- Atomic duplicate-slot protection using a MongoDB partial unique index.
- Provider-neutral email notifications through Aliyun DirectMail HTTPS OpenAPI or Resend; missing or failing email configuration never rolls back a booking.
- Confirmation email with a private, cross-device Manage Appointment link. The page immediately moves the high-entropy email token into session storage and removes it from the address bar; MongoDB stores only its SHA-256 hash.
- Customer emails for confirmation, one-time self-service rescheduling, cancellation, and merchant edits; optional merchant new-booking notification.
- English-first locale directories with Simplified Chinese starter strings.
- Free/Pro plan limits without a real billing dependency.
- Standalone Theme App Extension **source template** in `theme-extension-source/`.

Intentionally deferred: Google Calendar, SMS, deposits, staff-resource scheduling, resource capacity, recurring appointments, and complex timezone conversion.

## Lightweight architecture

```text
SHOPLINE Admin
  └─ OAuth + occasional product/rule management ──> Node.js API ──> MongoDB

Product page App Block
  ├─ rule config: GET once, cached in browser for 5 minutes
  ├─ selected-day availability: small uncached GET
  └─ final booking: one POST ──> atomic MongoDB insert
                                  └─ optional Aliyun DirectMail / Resend HTTPS email
```

Static UI and slot generation run in the browser. The API only serves small JSON responses. MongoDB uses a maximum application pool of 10 connections. Rule responses opt into five-minute public caching; availability is never cached. The final insert is authoritative, so caching cannot produce a double booking.

## Project layout

```text
src/
  lib/                 signatures, slot generation, validation
  middleware/          stateless admin session, CSRF, errors
  models/              Shop, AppointmentRule, Booking
  routes/              OAuth, admin API, public storefront API
  services/            SHOPLINE, booking, email, plan boundaries
  views/                admin application shell
public/admin/           SHOPLINE-like admin UI
public/manage/          Cross-device customer management page
theme-extension-source/ App Block source; not initialized by SHOPLINE CLI
test/                   Node test runner suites
docs/                   data model and API notes
```

## Requirements

- Node.js 20+
- MongoDB 6+
- A SHOPLINE public or custom app
- HTTPS URL for production callbacks
- Optional: Aliyun DirectMail with a least-privilege RAM user, or Resend
- Optional: Railway CLI and SHOPLINE CLI

## Environment

Copy `.env.example` to `.env` and fill at least:

```dotenv
APP_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/appointment-lite
MONGODB_DB_NAME=shopline_appointment_lite
SHOPLINE_APP_KEY=...
SHOPLINE_APP_SECRET=...
SESSION_SECRET=...
```

Important settings:

- `SHOPLINE_API_VERSION` defaults to `v20260301` and is centralized for upgrades.
- `MONGODB_DB_NAME` selects an isolated logical database inside the MongoDB service. It defaults to `shopline_appointment_lite`, so Railway can safely provide `MONGODB_URI=${{MongoDB.MONGO_URL}}` without URI string concatenation.
- `SHOPLINE_SCOPES` defaults to `read_products,read_store_information`.
- `COOKIE_SAME_SITE=lax` is appropriate for redirect mode. Embedded iframe mode may require `none` with HTTPS and SHOPLINE App Bridge work.
- `PUBLIC_ALLOWED_ORIGINS` should remain empty for a multi-merchant public app because every merchant has different storefront domains. CORS is not authentication; use dynamic installed-shop origin validation in a later hardening release if required.
- `EMAIL_PROVIDER=auto` prefers a complete Aliyun DirectMail configuration, then Resend. Use `aliyun`, `resend`, or `none` to force a mode.
- Aliyun DirectMail uses HTTPS OpenAPI rather than SMTP. Configure `ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_ACCESS_KEY_SECRET`, and the verified sender in `ALIYUN_DIRECTMAIL_ACCOUNT_NAME`.
- `RESEND_API_KEY`, `EMAIL_FROM`, and `MERCHANT_NOTIFICATION_EMAIL` remain available as a fallback. Booking success never depends on email delivery.
- See [Aliyun DirectMail and Resend setup](docs/EMAIL.md) before adding production credentials to Railway.

Generate secrets on macOS:

```bash
openssl rand -hex 32
```

## SHOPLINE app configuration

In SHOPLINE Developer Center:

1. Set the App URL to `https://YOUR_DOMAIN/`.
2. Set the callback URL to `https://YOUR_DOMAIN/auth/callback`.
3. Request `read_products` and `read_store_information`.
4. Use Redirect display mode for this MVP.
5. Copy the app key and secret into Railway variables.

The root route forwards SHOPLINE's signed installation query to `/auth/install`. Both the installation request and OAuth callback are verified with HMAC-SHA256 and a ten-minute timestamp window. See SHOPLINE's official [app authorization](https://developer.shopline.com/docs/apps/api-instructions-for-use/app-authorization/?version=v20260301) and [signature](https://developer.shopline.com/docs/apps/api-instructions-for-use/generate-and-verify-signatures/?lang=en) documentation.

## Local run

```bash
cp .env.example .env
npm install
npm test
npm run check
npm run dev
```

Open `http://localhost:3000/health`. A real OAuth install needs an HTTPS tunnel whose URL is configured as `APP_URL` and in SHOPLINE Developer Center.

## Railway deployment

1. Provision MongoDB or supply a reachable MongoDB Atlas URI.
2. Create/link the app service and set all production variables from `.env.example`.
3. Ensure `APP_URL` is the Railway public HTTPS domain.
4. Deploy:

```bash
railway link
railway up
railway domain
```

`railway up` uploads and deploys the current project; it does not create a public domain by itself. After a domain is available, update `APP_URL` and the SHOPLINE callback configuration, then redeploy.

## Theme App Extension: manual CLI creation

The repository deliberately does not contain a fake `.shopline-cli.yml`. Sign in and let SHOPLINE CLI create/associate the extension:

```bash
cd /path/to/appointment-lite
sl extension create --name theme-app-extension
# Select Theme App Extension and the intended SHOPLINE app.

rsync -a theme-extension-source/blocks/ theme-app-extension/blocks/
rsync -a theme-extension-source/public/ theme-app-extension/public/
rsync -a theme-extension-source/i18n/ theme-app-extension/i18n/

cd theme-app-extension
sl extension push
```

In the Theme Editor, add **Appointment Lite** to the product template. The block has no settings: adding it is the switch on, and removing it is the switch off. The extension automatically reads `{{ shop.id }}` and `{{ product.id }}`; its production API URL is fixed in the extension asset.

The App Block starts hidden and only appears after the public rule endpoint confirms that the current product has an enabled rule. Theme-editor re-renders are handled through SHOPLINE events plus a DOM observer. The production API origin is `https://appointment.toolkit.fans`. Open the preview console and filter for `[Appointment Lite]` to see store/product identity, cache, request status, visibility decisions, availability, and booking diagnostics without logging customer PII. SHOPLINE documents the OS 3.0 [extension structure](https://developer.shopline.com/docs/online-store-3-0-themes/integrate-apps-with-themes/theme-app-extension/structure?version=v20231201) and [`sl extension push`](https://developer.shopline.com/docs/online-store-3-0-themes/development-tools/cli/app-extension-commands/).

After a successful booking, the storefront stores a minimal receipt (booking ID, private management token, date, time, location, staff, and reschedule count) in that browser's local storage. On later visits to the same product, the block shows the confirmed appointment and a “Manage appointment” action. The confirmation email also contains a cross-device magic link. Email links carry a high-entropy `access` value for compatibility with clients that discard URL fragments. The management response is `no-store` with a `no-referrer` policy; JavaScript immediately moves the token to session storage and replaces the visible URL with the booking ID only. Legacy fragment links remain supported.

The customer can securely reschedule once or cancel without exposing customer PII or allowing management access by booking ID alone. The first change screen warns that it is the only online change; later attempts are rejected by the backend and direct the customer to contact the store. Merchants can edit confirmed bookings without consuming the customer allowance. Confirmation, reschedule, cancellation, and merchant-edit emails safely skip or report failure without reverting the booking. The backend stores only a SHA-256 hash of the management token. A compatibility lookup for pre-v0.1.5 receipts returns only `confirmed` or `cancelled`, requires matching store and product IDs, and never grants management access.

## Tests and checks

```bash
npm test
npm run check
```

Tests cover query signing/tampering, stateless session signing, weekday/date bounds, duration+buffer slot generation, rule and booking validation, denormalized booking creation, server-side slot validation, and conversion of MongoDB duplicate-key errors into a `409 SLOT_CONFLICT`.

## Security and production checklist

- Use a 32+ character `SESSION_SECRET` and HTTPS `APP_URL`.
- Keep `PUBLIC_ALLOWED_ORIGINS` empty for multi-merchant distribution; add dynamic installed-shop origin validation if CORS tightening is later required.
- Keep MongoDB private and enable backups.
- Add SHOPLINE mandatory GDPR/uninstall webhooks before marketplace review.
- Add bot protection and a stricter distributed rate limiter before high-volume public launch.
- Confirm token-refresh behavior against the app type and current SHOPLINE API version.
- Keep `theme-extension-source/` free of app credentials and never reuse another app's CLI metadata.

## Data and API references

- [Data model and atomic conflict design](docs/DATA_MODEL.md)
- [HTTP API summary](docs/API.md)
- [Aliyun DirectMail and Resend setup](docs/EMAIL.md)
- [Mac ZIP overlay/install procedure](docs/INSTALL_MAC.md)

## License

Private MVP. Add the desired license before public distribution.
