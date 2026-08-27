# Appointment Lite v0.6.14 — Service Editor Picker Polish

v0.6.14 standardizes every selection control inside the appointment-service wizard so the merchant experience no longer falls back to browser-native dropdown UI.

## What changed

- Replaces the native SELECT presentation inside **New / Edit appointment service** with one Appointment Lite picker treatment.
- Covers Checkout variant, Payment hold, Minimum notice, and dynamically-created Availability exception modes.
- Keeps the native SELECT elements as the underlying source of truth so existing validation, payload construction, and change handlers remain compatible.
- Adds keyboard navigation, selected-state checks, disabled-state synchronization, and locale refresh support.
- Makes menus flip above their trigger when there is not enough visible space below.
- Caps menu height to the visible wizard body and scrolls inside the menu rather than pushing other fields or being clipped by the modal footer.
- Replaces the browser-native service-time-zone datalist with an Appointment Lite searchable time-zone picker while preserving free IANA time-zone input.
- Applies the same viewport-aware drop-up behavior to the existing SHOPLINE Location picker.
- Reworks the standalone-paid SHOPLINE checkout explanation into a compact information card and adds clear spacing before Checkout variant and Payment hold controls.

## Safety / compatibility

- No service-rule schema or API contract changes.
- No booking, payment, order, staff, or availability semantics changed.
- Hidden native SELECT values remain available to existing code and form validation.
- Menus close when the wizard scrolls, the step changes, the dialog closes, or the viewport resizes.
- Mobile keeps compact scrollable picker menus without allowing them to cover the fixed wizard actions.
