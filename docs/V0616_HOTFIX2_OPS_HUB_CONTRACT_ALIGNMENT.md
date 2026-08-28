# Appointment Lite v0.6.16-hotfix.2 — Ops Hub Contract Alignment

## Root cause

Toolkit Ops Hub validates both the request envelope and each event with strict Zod schemas.
The previous Appointment Lite implementation sent a flat object such as:

```json
{"eventType":"app.heartbeat","occurredAt":"...","appVersion":"0.6.16","environment":"production"}
```

The current Hub contract requires:

```json
{
  "event": {
    "eventId": "appointment-lite:app.heartbeat:...",
    "occurredAt": "2026-08-28T02:00:00.000Z",
    "type": "app.heartbeat",
    "data": {
      "version": "0.6.16",
      "environment": "production"
    }
  }
}
```

HMAC-SHA256 is calculated over the exact raw JSON request body above using:

```text
<timestamp>.<raw-json-body>
```

## Exact current Hub event contract

- `app.heartbeat`: `data.version`, `data.environment`
- `shop.installed`: `data.shop`, optional `installedAt`, `installCount`, `metadata`
- `shop.uninstalled`: `data.shop`, optional `uninstalledAt`, `metadata`
- `shop.active`: `data.shop`, required `source`, optional `lastSeenAt`, `metadata`
- `usage.daily`: `data.dateKey`, strict four-field counters, optional `requestBuckets`
- `health.event`: optional `shop`, `category`, `eventType`, `status`, `message`, `reason`, optional `durationMs`, `requestId`, `metadata`

Shop identity is:

```json
{
  "externalStoreId": "<SHOPLINE store id or stable handle fallback>",
  "handle": "store-handle",
  "shopName": "store-handle",
  "primaryDomain": "store-domain"
}
```

## Usage mapping

Appointment Lite keeps detailed per-shop counters internally. Ops Hub currently expects one app-level row per UTC day.
Hotfix.2 aggregates Appointment Lite rows into one `usage.daily` event:

- `appApiCalls` = admin + availability + booking API requests
- `shoplineApiCalls` = SHOPLINE API request count
- `webhookCalls` = received SHOPLINE webhook count
- `errors` = canonical `health_errors` count
- all detailed Appointment Lite counters remain in `requestBuckets`

Legacy v0.6.16/hotfix.1 per-shop usage outbox rows rejected with HTTP 422 are superseded and their source day is reopened so one correct app-level snapshot can be generated.

## Backward recovery

Existing HTTP 422 outbox rows are normalized again at send time. Legacy events receive a deterministic event id derived from the MongoDB outbox `_id`, so retry idempotency remains stable.

## Safety

Ops Hub failures remain asynchronous and cannot block booking creation, SHOPLINE webhooks, merchant admin, email, or Google Calendar flows. Customer PII and secrets remain filtered from health metadata.
