# Data model

All collections live in the logical database selected by `MONGODB_DB_NAME` (default `shopline_appointment_lite`).

## Shop

One record per installed SHOPLINE store. In addition to OAuth/store metadata, it holds admin locale, store timezone, per-store Email Studio configuration, reserved plan information, and lightweight onboarding timestamps. OAuth tokens remain excluded from normal Mongoose query results.

## AppointmentRule

A rule is now a **service**, not necessarily a SHOPLINE product.

Important fields:

- `sourceType`: `product | standalone`
- `serviceType`: `product | in_store | onsite | consultation | class | other`
- `productId`, `productHandle`: populated only for product services
- `productTitle`: compatibility field used as the generic service display title for both source types
- `serviceDescription`
- `duration`, `buffer`
- `capacity`: 1–100 bookings per generated slot
- `minimumNoticeMinutes`: blocks appointments too close to the current store-local time
- `bookingWindowDays`: limits how far ahead a customer can book
- `dateFrom`, `dateUntil`
- `weeklyAvailability[{ weekday, enabled, windows[{ start, end }] }]`
- `availabilityExceptions[{ date, closed, windows[] }]`: a closed exception overrides weekly hours; an open exception can provide special hours even when that weekday is normally closed
- `location`, `staff`, `questionLabel`, `customQuestions`, `enabled`

Product uniqueness uses a partial index only when `sourceType='product'`, so each SHOPLINE product has one appointment rule while standalone services can exist without a product ID.

## Booking

Bookings preserve a denormalized service snapshot so records remain understandable after a rule changes.

Important fields include:

- `sourceType`, `serviceType`, optional `productId`
- `ruleId`, `productTitle`, `duration`, `buffer`, `timezone`, `location`, `staff`
- `date`, `time`, `slotKey`
- `slotPosition`: reserved position inside a capacity-enabled slot
- customer name/email/optional phone/note/answers
- `status`: `confirmed | cancelled | completed | no_show`
- `managementTokenHash`, customer reschedule count, merchant edit timestamps
- append-only `events[]` including `created`, reschedule/edit/cancel events, `merchant_completed`, and `merchant_no_show`

### Capacity-safe atomic booking

The confirmed-booking partial unique index is:

```js
{ shopId: 1, ruleId: 1, slotKey: 1, slotPosition: 1 }
unique where { status: 'confirmed' }
```

For capacity `N`, the service attempts positions `0..N-1`. MongoDB arbitrates each position. This avoids the race in a count-then-insert design: concurrent customers can fill different positions but cannot exceed capacity. Cancelling or moving a confirmed booking releases its position.

## Scheduling policy

A selected date/time must be generated from the stored rule and pass all of these checks server-side:

1. date bounds;
2. weekly hours or a date-specific exception;
3. store-time-zone elapsed-slot protection;
4. minimum notice;
5. booking window;
6. remaining slot capacity.

Standalone one-off services are allowed to have no recurring weekday schedule when at least one open availability exception exists.

## Merchant onboarding state

`Shop.onboarding` stores only setup progress timestamps. Product appointments use the Theme App Block; standalone services do not need theme editing. Quickstart still presents App Block setup first, but service creation is not locked behind it, allowing standalone-only merchants to continue directly. Once the first active service is standalone, onboarding treats the storefront-entry requirement as satisfied.
