# Appointment Lite v0.8.1.1 — Service Wizard Simplification & UI Polish

## Goal

Simplify the service creation flow after the v0.8.1 booking-model / storefront-placement refactor. The wizard now keeps business logic, storefront discovery, scheduling, and customer-facing details in separate steps.

## Wizard structure

1. **Booking model**
   - Service name
   - Standalone booking vs Purchase-triggered booking
   - Standalone payment choice: No payment / Pay during booking
   - Trigger products or checkout product only when required
2. **Placement**
   - Direct booking link
   - Regular Page App Block
   - Staff Directory block
   - Product detail App Block: all products or selected products
   - App Embed floating launcher
   - Purchase-triggered services remain private after payment and therefore do not expose public placement controls
3. **Availability**
   - Booking mode: Minute/hour, All day, Multiple sessions
   - Duration, buffer, capacity, session count
   - Service timezone, minimum notice, booking window, date range
   - Weekly schedule and exceptions
4. **Details**
   - Optional service category
   - Service description
   - Location / online meeting
   - Staff assignment
   - Notes and custom questions
   - Active state

## Service category change

The former six-card **Service type** choice is removed from the primary wizard. `serviceType` remains in the persisted data model for backwards compatibility, list filtering, and optional classification, but it no longer changes booking mode, payment, placement, or availability behavior.

## UI changes

- Replaced large stacked fieldsets with a lighter decision hierarchy.
- Booking model uses two focused decision cards.
- Payment uses compact segmented radio-style controls.
- Placement uses compact selectable cards with clear selected states.
- Product page coverage appears only when Product detail App Block is enabled.
- Purchase-triggered placement is represented by a single private-scheduling explanation instead of disabled public controls.
- Booking mode and schedule now live together under Availability.
- Optional service category is moved to Details.
- Admin assets use `build=0.8.1.1` for cache busting while the npm package version remains `0.8.1` for the current compatibility line.

## Compatibility

No booking data migration is required. Existing v0.8.1 records continue to load through `bookingType`, `paymentMode`, `storefrontPlacement`, and the compatibility `serviceType` field.
