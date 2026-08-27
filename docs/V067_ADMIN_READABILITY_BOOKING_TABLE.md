# Appointment Lite v0.6.7 — Admin Readability + Booking Table Cleanup

## Scope

This release is a merchant-admin UX refinement on top of v0.6.6. It does not change booking eligibility, payment confirmation, order reconciliation, scheduling capacity, or SHOPLINE order data.

## Readability

The admin neutral palette now uses higher-contrast near-black text:

- Primary: `#111827` / `#172033`
- Secondary: `#344054`
- Supporting metadata: `#475467`

Semantic status colors remain green, amber, red, and blue. The change is intentionally not pure `#000000`; near-black preserves hierarchy and is easier to scan across dense operational screens.

## Booking records

The list layout is now:

1. Customer & service
2. Date & time
3. Assignment
4. Payment
5. Appointment
6. Actions

The separate SHOPLINE order-number column is removed. When a linked SHOPLINE order is available, merchants can still open it from the row action group. Payment and Appointment status badges are centered and the actions column receives more space to prevent wrapping into neighboring columns.

Purchase-first lifecycle rows show `Unassigned` until a staff member is chosen, instead of repeating `Not scheduled yet` in both scheduling columns.
