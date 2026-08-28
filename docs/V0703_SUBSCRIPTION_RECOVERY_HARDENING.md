# Appointment Lite v0.7.0.3 - Subscription Recovery Hardening

## Goal

v0.7.0.3 makes renewal recovery deterministic after SHOPLINE reports a previously active Appointment Lite Pro subscription as expired, inactive, cancelled, pending, or otherwise unavailable.

SHOPLINE can enforce its own package gate before the embedded Appointment Lite URL is loaded. Application code cannot bypass that platform-level redirect. This release therefore hardens every recovery path that is available once Appointment Lite is loaded or resumed.

## Recovery rules

- A healthy `active` subscription may use the normal short subscription cache.
- Any local subscription state that is not `active` bypasses the normal cache on admin startup and is reconciled with the SHOPLINE Partner API immediately.
- An `active` local state whose `end_at + grace period` has already elapsed is also treated as a recovery state and is force-reconciled.
- The local expired/archive state is never accepted as authoritative merely because `lastSyncedAt` is recent.
- If the Partner API reports valid access again, the admin switches from `archive` / `subscription_required` to `full` immediately.

## Renewal recovery paths

### Reopen the app after renewal

When the merchant renews on the SHOPLINE package page and then opens Appointment Lite again, `/api/admin/bootstrap` detects the stale inactive local state and performs a real Partner API sync before deciding the admin mode.

### Manual refresh

**Refresh subscription** always performs an authoritative Partner API sync. When the result changes from an unavailable mode to `full`, Appointment Lite reloads the complete admin bootstrap and shows a recovery confirmation.

### Browser back / resumed tab

If the merchant returns to an already-open Appointment Lite page from the SHOPLINE package page, the admin performs a throttled recovery check on:

- window focus;
- a visible-tab transition; and
- BFCache `pageshow` restoration.

These checks only run while the app is not in full mode. There is no continuous polling loop for healthy subscriptions.

## Webhook + startup reconciliation

Signed SHOPLINE subscription webhooks remain the fastest path:

- `appsubscription/create` updates the local active state and now follows with Partner API reconciliation.
- `appsubscription/paid` reconciles after a successful payment result.
- `appsubscription/expiration` reconciles after the expiration event.

Webhook reconciliation is best effort: a temporary Partner API failure does not cause a valid signed webhook to fail. The next admin startup still performs recovery reconciliation when the local state is unavailable.

## Merchant-facing result

After SHOPLINE reports valid access again:

- archive mode is removed;
- disabled navigation is restored;
- normal booking operations are restored;
- storefront booking access resumes through the existing subscription checks; and
- the merchant sees **SHOPLINE subscription restored. Full access is available again.**

No service, staff, booking, calendar, email, or storefront configuration is recreated or migrated during recovery.

## Platform limitation

If SHOPLINE redirects a merchant from the Admin app list directly to `/admin/app-store/package/{packageId}` before loading Appointment Lite, that redirect happens upstream of this application and cannot be overridden by Appointment Lite code.

v0.7.0.3 improves recovery after renewal and for already-loaded/resumed sessions; it does not bypass SHOPLINE's platform-level paid-package gate.
