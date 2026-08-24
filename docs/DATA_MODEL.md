# Data model

All collections live in the logical database selected by `MONGODB_DB_NAME` (default: `shopline_appointment_lite`). This isolates the app from other databases hosted by the same MongoDB service.

## Shop

One record per SHOPLINE handle. Stores the SHOPLINE store ID used by the zero-configuration Theme App Extension, primary domain, OAuth tokens, token expiry, granted scopes, locale, store timezone, notification email, reserved plan, and install lifecycle timestamps. Access and refresh tokens are excluded from normal Mongoose query results.

## AppointmentRule

One record per `(shopId, productId)`, enforced by a unique index.

Important fields:

- Product snapshot: `productId`, `productTitle`, `productHandle`
- Slot shape: `duration`, `buffer`
- Date bounds: `dateFrom`, `dateUntil`
- Weekly schedule: `weeklyAvailability[{ weekday, enabled, windows[{ start, end }] }]`
- Lightweight resources: `location`, `staff` as text
- Form: `questionLabel`, `customQuestions`
- Lifecycle: `enabled`, timestamps

The UI edits one time window per day in v0.1.0, while the model and slot generator already accept multiple windows.

## Booking

Bookings preserve a snapshot of product title, duration, buffer, timezone, location, and staff so historical records remain readable after rule changes.

Customer data contains name, email, optional phone, note, and answers. Status is `confirmed` or `cancelled`.

### Atomic conflict protection

Each booking has `slotKey = YYYY-MM-DDTHH:mm`. MongoDB owns this partial unique index:

```js
{ shopId: 1, ruleId: 1, slotKey: 1 }
unique where { status: 'confirmed' }
```

Two simultaneous inserts for the same slot race at the database. Exactly one succeeds; the other gets duplicate-key error `11000`, which the service converts into HTTP `409 SLOT_CONFLICT`. Cancelling changes status to `cancelled`, removing the document from the partial index and making the slot bookable again without deleting history.

The server regenerates valid slots from the stored rule before inserting. A customer cannot create an arbitrary time by bypassing the browser UI.

## Timezone boundary

This MVP stores merchant-local `date` and `time` strings plus the shop's IANA timezone snapshot. It deliberately does not perform complex timezone conversion. A later calendar-integration release should add an unambiguous UTC instant calculated with a timezone-aware library and migration tests for DST transitions.
