# Appointment Lite v0.6.6 — Booking Admin UX Polish

This release is a merchant-experience refinement on top of v0.6.5.

## Service editor

The purchase-first scheduling explanation is now a compact information card rather than a large free-form text block. It keeps the key merchant concepts visible without competing with the actual configuration fields.

The SHOPLINE location selector no longer uses the browser-native select menu. Appointment Lite renders its own location picker using the same border, radius, typography, hover, and selected states as the rest of the admin UI. Location names, addresses, and the SHOPLINE default-location marker remain visible.

## Booking records

The list order is based on record origin rather than mutable lifecycle updates. Order-backed rows prefer the original SHOPLINE order creation timestamp; existing records without that timestamp fall back to the entitlement or booking creation time. Payment updates no longer move an older order above a newer order just because its status changed later.

Columns are ordered as:

1. Customer & service
2. SHOPLINE order
3. Date & time
4. Assignment
5. Payment
6. Appointment
7. Actions

Payment and appointment state are therefore grouped later in the operational row, after the primary scheduling details.

## Record deletion

Booking rows expose a Delete action that uses the existing Appointment Lite confirmation modal rather than a browser-native confirm dialog.

Deletion is implemented as a soft delete (`adminDeletedAt`) so MongoDB history is not physically destroyed. If the record is still an active appointment, Appointment Lite cancels the appointment internally, releases capacity/staff reservations, sends the normal cancellation notice when applicable, and reconciles Google Calendar so stale events are removed. The linked SHOPLINE order is never deleted.

Order-lifecycle rows can also be removed. Removing one revokes any remaining private scheduling access for that lifecycle record and hides it from Appointment Lite Booking records while leaving the SHOPLINE order unchanged.
