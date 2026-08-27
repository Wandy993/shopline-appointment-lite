# Appointment Lite v0.6.11 — Email Template Polish

v0.6.11 focuses on the visual quality and email-client compatibility of Appointment Lite transactional emails.

## Brand header

The previous email header used a flex layout. Some email clients handle flexbox inconsistently, which could leave the 40px brand icon visually too close to the brand name or slightly misaligned.

The header now uses a presentation table with:

- a fixed 40px logo cell;
- a dedicated 14px spacing cell;
- a vertically centered brand-name cell;
- consistent 20px top/bottom header padding.

This layout is intentionally conservative for email compatibility and applies to confirmation, update, reminder, staff, merchant, and post-purchase messages through the shared email document renderer.

## Google Calendar action

Calendar-enabled emails now use a neutral white Google-style button instead of inheriting the merchant accent color. The action includes the multicolor Google G asset from Google's `gstatic.com` infrastructure and keeps **Add to Google Calendar** as the explicit action label.

Appointment Lite-owned actions, such as **Manage appointment**, continue to use the merchant-configured accent color. This keeps product branding and external-provider branding visually distinct.

## Email Studio preview

Email Studio now previews calendar-enabled templates with the same hierarchy:

1. Appointment Lite / merchant-branded primary action where relevant;
2. separate **Add to calendar** panel;
3. Google-branded calendar action.

Cancellation templates do not show a calendar action.
