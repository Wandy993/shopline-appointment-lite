# Appointment Lite v0.7.0.6 — SHOPLINE Package-Only Hard Lock

## Why

A production stack trace showed `createSubscriptionCheckout()` still reaching `create_pay.json`. The trace line number exactly matched v0.7.0.4, which means an older runtime/static asset could still invoke the legacy Partner checkout path.

## Changes

- Removed the `create_pay.json` checkout path from `createSubscriptionCheckout()`.
- The backend `/api/admin/subscription/checkout` compatibility endpoint now returns only the official SHOPLINE app package URL and performs no subscription-sync or checkout preflight.
- The admin client no longer falls back to `/subscription/checkout`; it opens `shoplinePlanUrl` only.
- Disabled production caching for `/admin` assets and `/app` so stale embedded-admin JavaScript cannot keep the old checkout behavior for an hour after deployment.
- `/health` keeps the compatibility `version/build` fields and adds `release: v0.7.0.6-shopline-package-only` so production can be verified without regressing existing health consumers.
- Startup logs include the v0.7.0.6 build marker.

## Expected subscription entry

`https://{handle}.myshopline.com/admin/app-store/package/{packageId}`

Appointment Lite no longer needs Partner `create_pay.json` for the current single-plan billing model. Partner API remains in use for subscription status sync, charge lookup compatibility, and lifecycle reconciliation.
