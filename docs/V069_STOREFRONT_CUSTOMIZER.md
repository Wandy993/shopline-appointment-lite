# Appointment Lite v0.6.9 — Storefront Customizer

## Goal

Give merchants a storefront-level design layer for Appointment Lite so the booking experience can fit different SHOPLINE themes without editing theme code or changing appointment business rules.

## Merchant controls

The **Storefront setup** page now contains a live preview and two configuration groups.

### Booking button

- Button text
- Background color
- Text color
- Width: **Fit content** or **Full width**
- Alignment: left, center, or right when Fit content is used
- Corner radius: 0–24 px

The default width is **Fit content**, avoiding the previous forced full-width product-page appointment button.

### Booking dialog

- Dialog title
- Accent color
- Primary-action text color
- Show/hide service summary
- Show/hide customer time-zone selector
- Show/hide optional Phone field
- Show/hide Notes field
- Show/hide footer guidance

## Protected booking elements

Storefront customization must not make a service impossible to fulfill. The following remain rule-driven rather than merchant-hideable styling options:

- Customer Name
- Customer Email
- Calendar/date selection
- Required appointment time/session selection
- Customer service address when a service uses **Customer address**
- Staff selector when the service requires **Customer choice**
- Custom questions configured on the service
- Payment/commerce behavior

## Storefront rendering

`Shop.storefrontSettings` stores one global storefront profile per shop. The public `/api/public/rule` and `/api/public/service` payloads include normalized storefront settings.

The Theme App Block applies button styling directly to its widget and applies modal accent/text variables when the dialog is mounted. Optional fields are conditionally rendered while required fields stay intact.

The hosted/direct booking page uses the same modal accent and optional-field visibility settings for a consistent customer experience.

Public rule/service responses use revalidation instead of long-lived browser persistence for storefront settings. The Theme Extension only keeps rule data in memory for the current page lifecycle, so a normal page refresh can pick up newly saved storefront design changes.

## Compatibility

This release does not add Theme App Extension block settings. Merchants configure the storefront globally inside Appointment Lite, so one design is shared across product App Blocks and direct booking links. Per-service scheduling, locations, staff assignments, and commerce modes continue to operate independently.
