# Appointment Lite v0.8.16 — Email Studio Layout

## Problem

The v0.8.15 admin design-system rollout applied the shared 280px description / flexible content grid to every `.form-section`. That pattern works for compact configuration groups, but it is not suitable for long Email Studio forms. The section title occupied the left column while all controls stayed in the right column, leaving a large empty area and constraining email fields, template tabs, and notification controls.

## Changes

- Keep the overall Email Studio editor + live preview two-column workspace.
- Change the three Email Studio form cards (Brand identity, Notification recipients, Message templates) to a single-column card layout.
- Place each section number, title, and description above its controls.
- Let all form controls use the full width of the editor column.
- Keep paired recipient fields in a two-column row; the additional recipient textarea spans the full width.
- Display Customer notifications and Merchant notifications as two balanced groups on wide screens, with the reminder timing row spanning both columns.
- Keep notification options in a two-column grid where space allows and collapse them on narrow screens.
- Let all template tabs use the available width and keep email subject, heading, body, and variable chips at full width.
- Increase the template body editor's minimum height for more comfortable editing.
- Collapse field rows, notification groups, and option cards to one column on small screens.

## Preserved

- Email preview remains on the right at desktop widths and continues to use the existing Jost/Poppins preview typography.
- The preview becomes a normal full-width section below the editor at the existing responsive breakpoint.
- No notification settings, email template values, persistence, send-test, or save behavior is changed.
- Storefront Setup retains the 280px description / flexible control-column pattern.
- No API, booking, scheduling, billing, or calendar logic changes.

## Verification

Regression tests cover the Email Studio full-width card layout, responsive collapse, and the unchanged editor/preview split.
