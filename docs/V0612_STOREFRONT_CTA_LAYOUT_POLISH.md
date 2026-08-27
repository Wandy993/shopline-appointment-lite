# Appointment Lite v0.6.12 — Storefront CTA Layout Polish

v0.6.12 makes the final booking action lighter on desktop while preserving a large tap target on mobile.

## Changes

- The hosted/direct booking page defaults **Confirm booking** to fit-content width and right alignment on desktop.
- The Theme App Block booking dialog uses the same compact right-aligned primary action.
- Paid booking uses the same layout for **Continue to checkout**.
- Mobile layouts always expand the primary action to full width for reliable touch interaction.
- Storefront Setup now exposes **Primary action width** and **Primary action alignment** under Booking dialog.
- Merchants can choose Fit content / Full width and Left / Center / Right alignment for desktop.
- The live storefront preview mirrors the configured primary-action layout.
- Existing storefront settings remain backward compatible; stores without the new fields use the new safe defaults.
