# Appointment Lite v0.7.0.1 - Trial Days Display Fix

## Fix

SHOPLINE can return an `end_at` timestamp that is a few minutes later than exactly seven 24-hour periods because the platform may normalize the subscription end to a billing boundary.

The v0.7.0 UI calculated remaining trial days with `Math.ceil((end_at - now) / 1 day)`. A seven-day trial that was seven days plus a few minutes therefore displayed as eight days remaining.

v0.7.0.1 keeps the exact SHOPLINE `end_at` timestamp for access control and billing-state display, but caps the merchant-facing remaining-day count to the configured SHOPLINE trial term (`SHOPLINE_SUBSCRIPTION_TRIAL_DAYS`, currently 7).

This is a display-only correction. It does not shorten or alter the actual SHOPLINE trial or subscription expiry timestamp.
