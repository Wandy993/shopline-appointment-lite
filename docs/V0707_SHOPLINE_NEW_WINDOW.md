# Appointment Lite v0.7.0.7 — SHOPLINE Subscription New Window

## Goal

Keep the Appointment Lite admin page open when a merchant starts or renews a SHOPLINE subscription.

## Changes

- `Continue with SHOPLINE` opens the official SHOPLINE package page in a separate browser tab/window using `_blank`.
- The archive-mode renewal entry uses the same behavior for consistency.
- External windows use `noopener,noreferrer`.
- The Continue button is re-enabled immediately after the new window opens, because the Appointment Lite page no longer navigates away.
- If the browser blocks the new window, Appointment Lite shows an actionable pop-up-blocker message.
- The SHOPLINE package page remains the only activation/renewal entry; `create_pay.json` is still not used at runtime.
- Production `/health` release marker is `v0.7.0.7-shopline-new-window`.
