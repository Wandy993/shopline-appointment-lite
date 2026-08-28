# Appointment Lite v0.7.0.2 - Subscription Archive Mode & Renewal Recovery

## Goal

When a store that previously activated Appointment Lite Pro no longer has subscription access after the configured grace period, Appointment Lite enters a read-only archive mode instead of deleting or hiding historical booking data.

## Access modes

- `full`: subscription disabled, active subscription, or SHOPLINE grace period still applies.
- `archive`: the store previously activated Appointment Lite, but subscription access is no longer valid.
- `subscription_required`: the store has never had an active subscription and still needs to start/complete a SHOPLINE subscription.

## Archive mode

Archive mode is intentionally narrow:

- The merchant can open **Bookings** and review historical booking records.
- Booking list search and filters remain available.
- **Export CSV** remains available and is generated from the read-only booking data already loaded by the admin.
- Booking edit/status/cancel/delete/activity/order actions are removed from the archive UI.
- Booking calendar mode and order reconciliation controls are hidden.
- **Plan & billing** remains available.
- Other admin navigation items are disabled.
- Server-side admin mutation/read APIs remain blocked with `402 SUBSCRIPTION_ARCHIVE_READ_ONLY`; the only archived business data endpoint allowed by the admin subscription middleware is `GET /bookings`.
- Storefront availability and new booking creation remain unavailable because they still require active subscription access.
- SHOPLINE order business webhooks, paid-order reconciliation, post-purchase scheduling notifications, and upcoming reminder emails are suppressed while subscription access is inactive. Subscription and app lifecycle webhooks remain enabled so renewal/uninstall state can still recover correctly.

## Renewal

The archive banner and Plan & billing page expose **Renew with SHOPLINE**.

The button targets:

`https://{handle}.myshopline.com/admin/app-store/package/{packageId}`

`packageId` uses `SHOPLINE_SUBSCRIPTION_PACKAGE_ID` when configured and falls back to `SHOPLINE_APP_KEY`.

After the merchant renews in SHOPLINE, reopening Appointment Lite or clicking **Refresh subscription** runs the normal Partner API subscription sync. Once SHOPLINE reports valid access, the admin returns to `full` mode and all normal features are restored without recreating services, staff, bookings, or settings.

## Environment variable

```env
SHOPLINE_SUBSCRIPTION_PACKAGE_ID=
```

Set this only when the identifier used in the SHOPLINE `/admin/app-store/package/{id}` URL is different from `SHOPLINE_APP_KEY`.

## Platform-level limitation

This code can only render archive mode after SHOPLINE actually loads the Appointment Lite application URL. If SHOPLINE itself redirects a merchant to its package selection/billing page before the embedded app is loaded because there is no active application package, application code cannot override that upstream platform gate.

If platform-level enforcement prevents the app from loading after expiration, a guaranteed in-admin archive experience requires a SHOPLINE-supported fallback access model (for example an active free/archive package if SHOPLINE permits that lifecycle) or a platform setting that allows the embedded app to load without an active paid package.
