# Appointment Lite v0.6.16 — Ops Hub Observability Integration

## Purpose

Appointment Lite reports operational lifecycle, usage, and health telemetry to Toolkit Ops Hub without placing Ops Hub on the customer booking critical path.

## Protocol

Endpoint: `OPS_HUB_INGEST_URL`

Headers:

- `X-Ops-App-Key`
- `X-Ops-Timestamp`
- `X-Ops-Signature: sha256=<hex>`

Signature source is exactly `<timestamp>.<raw-json-body>` using HMAC-SHA256 and the app-specific `OPS_HUB_INGEST_SECRET`.

## Events

- `shop.installed`: OAuth first install/reinstall and SHOPLINE lifecycle recovery.
- `shop.uninstalled`: SHOPLINE `apps/installed_uninstalled` lifecycle webhook.
- `shop.active`: merchant Admin activity, throttled per store.
- `app.heartbeat`: periodic backend heartbeat.
- `usage.daily`: daily aggregated App API, SHOPLINE API, Webhook, Booking, Calendar and Email counters.
- `health.event`: deduplicated operational warnings/errors.

Appointment Lite does not emit subscription events because it does not currently have a billing lifecycle integration.

## Health coverage

- `availability.slow`
- `booking.create.failed`
- `shopline.api.failed`
- `shopline.token.refresh.failed`
- `shopline.webhook.invalid_signature`
- `shopline.webhook.invalid_json`
- `shopline.webhook.failed`
- `order.webhook.failed`
- `order.reconciliation.failed`
- `order.reconciliation.scheduler_failed`
- `google.calendar.sync.failed`
- `email.send.failed`
- `reminder.send.failed`
- `reminder.scheduler.failed`

Health events use a short deduplication window so one repeated store error does not flood Ops Hub.

## Delivery safety

Telemetry is first written to a MongoDB outbox, then delivered by a background scheduler. Ops Hub timeouts or HTTP errors never fail a merchant request, customer booking, SHOPLINE webhook processing result, email flow or Google Calendar flow. Failed events use bounded retry backoff and persisted payloads are normalized again before each send.

## Privacy

Ops Hub telemetry intentionally excludes customer email, phone, address, notes, names, SHOPLINE access tokens, Google tokens, cookies, Authorization headers, secrets and full request bodies. Store identity uses the stable SHOPLINE handle domain (`<handle>.myshopline.com`) rather than a merchant custom storefront domain.

## Railway configuration

```env
OPS_HUB_ENABLED=true
OPS_HUB_INGEST_URL=https://toolkit-ops-hub-production.up.railway.app/api/ingest/v1/events
OPS_HUB_APP_KEY=appointment-lite
OPS_HUB_INGEST_SECRET=<unique secret issued by Toolkit Ops Hub>
```

Optional tuning variables are documented in `.env.example`.

## SHOPLINE lifecycle webhook

v0.6.16 adds `apps/installed_uninstalled` to the webhook reconciliation list and routes the event through the existing signed `/webhooks/shopline` endpoint. The webhook uses the same raw-body HMAC verification and idempotent receipt model as booking-commerce webhooks.
