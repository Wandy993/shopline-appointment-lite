# Appointment Lite v0.8.0 — Core Booking Architecture + Staff Booking

## Scope

- Standalone free services remain fully product-independent.
- Added a regular Page booking Theme App Block.
- Added public Staff Directory profiles and a Page Staff Directory block.
- Staff directory booking links preselect the chosen staff member.
- Added private online meeting configuration for Zoom, Google Meet, Microsoft Teams, and custom HTTPS links.
- Meeting URLs are not serialized in pre-booking service responses; they are snapshotted to confirmed bookings and then shown in confirmation, transactional email, and Google Calendar event details.
- Staff email and phone remain private and are excluded from the public directory API.

P0 trust / Google OAuth verification / email deliverability work is intentionally deferred.
