# Appointment Lite v0.6.16-hotfix.1 — Ops Hub Payload Compatibility

## Why this hotfix exists

The v0.6.16 production service starts normally and `/health` returns HTTP 200, but the first Toolkit Ops Hub `app.heartbeat` can be rejected with HTTP 422 `Invalid ingest payload`.

The Hub validates event bodies with strict per-event schemas. v0.6.16 attached an optional `metadata` object to `app.heartbeat`; that field is not required for a heartbeat and can make a strict heartbeat schema reject the whole event.

## Changes

- `app.heartbeat` is now a minimal event containing only the common Ops Hub envelope.
- `shop.installed`, `shop.uninstalled`, and `shop.active` also discard arbitrary metadata before delivery.
- `health.event` remains the single envelope for allowlisted diagnostic metadata.
- Persisted outbox payloads are normalized again immediately before sending, so previously stored heartbeat rows self-heal.
- Failed HTTP 422 rows are made eligible for one immediate retry on application startup after the compatibility normalizer is deployed.
- Ops Hub rejection parsing now includes safe schema issue summaries such as rejected keys and field paths when the Hub returns them.
- Railway delivery failures are logged as one structured JSON line on stdout, avoiding the previous multi-line `console.warn` output where a standalone `}` could appear as an error entry.
- `/health` keeps application version `0.6.16` and adds build marker `0.6.16-hotfix.1`.

## Storefront impact

None. Theme App Extension source remains at v0.6.16. The release workflow may still push the existing extension in parallel with Railway to preserve the normal Appointment Lite release process.

## Expected production verification

After deployment:

1. `/health` returns HTTP 200 with `version=0.6.16` and `build=0.6.16-hotfix.1`.
2. The scheduler queues a minimal `app.heartbeat`.
3. A prior HTTP 422 outbox row is retried after send-time normalization.
4. A successful Hub delivery no longer produces `Ops Hub delivery failed`.
5. If the Hub still rejects the event, the Railway log contains one JSON line with the specific safe validation issue, which is sufficient for the next contract adjustment.
