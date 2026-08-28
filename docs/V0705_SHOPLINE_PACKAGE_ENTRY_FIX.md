# Appointment Lite v0.7.0.5 — SHOPLINE Package Entry Fix

## Why this release exists

Appointment Lite previously used `app_subscribe/create_pay.json` when a merchant clicked **Continue with SHOPLINE**. SHOPLINE Admin itself already sends merchants without an active subscription to the app package page, and that package page owns trial eligibility, billing and renewal.

v0.7.0.5 therefore makes the official SHOPLINE package page the primary subscription entry for the single Appointment Lite Pro plan.

## Behavior

- `Continue with SHOPLINE` opens `https://{handle}.myshopline.com/admin/app-store/package/c0ced1537654a66c337cd3af4b820b7eac9dd33c`.
- Archive-mode renewal uses the same package page.
- After activation/renewal, Appointment Lite still uses Partner API subscription sync + webhooks as the source of truth.
- `create_pay.json` remains as a defensive fallback only when a package URL cannot be constructed.
- No local trial lifecycle is added; the 7-day trial remains SHOPLINE-managed.

## Why this is safer

It matches the actual SHOPLINE Admin entry path and avoids blocking activation on a separate checkout-creation API call.
