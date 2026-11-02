# Appointment Lite v0.8.17 — Storefront Setup Layout Recovery

## Issue

The shared v0.8.15 configuration-card rule was applied to both generic `.form-section` cards and Storefront Setup's `.storefront-config-group` cards. Storefront Setup already has a two-column workspace: controls on the left and a live storefront preview on the right. Adding another fixed 280px description column inside each control card left too little room for its controls.

The resulting layout compressed booking-theme choices, segmented controls, color inputs, and customer-facing option toggles. Some controls extended beyond their card boundary, and the live preview scrolled out of view when editing lower sections.

## Changes

- Scope the 280px description / flexible control-column pattern to generic `.form-section` cards only.
- Restore Storefront Setup configuration cards to a single full-width column.
- Place each configuration title and description above the controls.
- Keep the booking-theme choices in three balanced columns on desktop.
- Keep option-row labels and segmented controls side-by-side with sufficient control width.
- Keep color settings and customer-facing element toggles in balanced two-column layouts.
- Collapse booking themes, color rows, element toggles, and option rows at mobile widths.
- Keep the storefront live preview sticky while scrolling through the configuration cards on desktop.
- Return the preview to normal document flow when the overall Storefront Setup workspace collapses to one column at 1100px.

## Preserved

- The outer Storefront Setup controls + live preview split remains unchanged.
- Booking theme selection, colors, button width/alignment, radius, dialog title, and visibility toggles keep their existing controls and behavior.
- Save, unsaved-change warning, and live preview update logic are unchanged.
- Email Studio's v0.8.16 stacked heading + full-width controls layout remains unchanged.
- No storefront runtime, booking API, scheduling, payment, staff, or calendar business logic changes.

## Verification

Regression tests assert that Storefront Setup cards use one full-width control column, booking theme cards remain balanced on desktop, option rows have sufficient control width, and the preview sticks on desktop but returns to normal flow on narrow screens.
