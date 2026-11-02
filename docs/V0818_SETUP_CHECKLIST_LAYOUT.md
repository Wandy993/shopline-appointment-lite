# Appointment Lite v0.8.18 — Setup Checklist Layout

## Problem

The Storefront Setup launch section inherited the generic 280px description-column utility through the shared `.setup-layout` selector. That class is a real two-panel component, not a generic configuration-card helper. As a result, the three-step launch checklist was squeezed into a narrow column while the short Quick setup panel occupied most of the available width.

## Changes

- Remove `.setup-layout` from the generic 280px configuration-layout utility.
- Present Quick setup as a compact full-width information banner above the launch checklist.
- Present the three launch steps as three balanced desktop cards in one row.
- Give the App Block step enough room for both actions and its inline status hint.
- Keep the three steps in a vertical stack on narrower screens.
- Reflow the Quick setup banner into a compact two-column / stacked layout on smaller screens.

## Preserved

- The Quick setup explanation, store identifier, and all three checklist steps remain available.
- Existing App Block theme-editor link, App Block confirmation button, create-service action, and booking-preview link retain their original IDs and event wiring.
- The setup completion state and service creation behavior are unchanged.
- No booking, scheduling, payment, staff, calendar, or API behavior changes.

## Verification

Regression tests cover the one-column setup wrapper, three-card desktop checklist, compact Quick setup banner, original step IDs, and responsive collapse.
