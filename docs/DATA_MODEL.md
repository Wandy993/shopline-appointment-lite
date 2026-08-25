# Data model

All collections live in the logical database selected by `MONGODB_DB_NAME` (default `shopline_appointment_lite`).

## Shop

One record per installed SHOPLINE store. In addition to OAuth/store metadata, it holds admin locale, store timezone, per-store Email Studio configuration, reserved plan information, and lightweight onboarding timestamps. OAuth tokens remain excluded from normal Mongoose query results.

## AppointmentRule

A rule represents an **appointment service**. v0.3.1 separates the service category from the storefront/booking channel.

Important fields:

- `bookingSource`: `product | direct | both`
  - `product`: booking starts from the linked SHOPLINE product page/App Block
  - `direct`: booking starts from the hosted `/book/:ruleId` page
  - `both`: both entry points are enabled
- `sourceType`: legacy compatibility field (`product | standalone`); new code uses `bookingSource`
- `serviceType`: `appointment | in_store | onsite | consultation | class | other` (`product` remains accepted for legacy records and is migrated to `appointment`)
- `serviceTitle`: customer-facing appointment service name
- `productId`, `productTitle`, `productHandle`: optional SHOPLINE product binding, required for `bookingSource=product|both`
- `serviceDescription`
- `duration`, `buffer`
- `capacity`: 1–100 bookings per generated slot
- `minimumNoticeMinutes`
- `bookingWindowDays`
- `dateFrom`, `dateUntil`
- `weeklyAvailability[{ weekday, enabled, windows[{ start, end }] }]`
- `availabilityExceptions[{ date, closed, windows[] }]`
- `location`, `staff`, `questionLabel`, `customQuestions`, `enabled`

The SHOPLINE product binding uses a partial unique index for non-empty `productId`, so one product maps to one Appointment Lite service while direct-only services can exist without a product.

## Booking

Bookings preserve a denormalized service snapshot so records remain understandable after a rule changes.

Important fields include:

- `bookingSource`, legacy `sourceType`, `serviceType`, optional `productId`
- `ruleId`, `productTitle` (denormalized service display title), `duration`, `buffer`, `timezone`, `location`, `staff`
- `date`, `time`, `slotKey`
- `slotPosition`: reserved position inside a capacity-enabled slot
- customer name/email/optional phone/note/answers
- `status`: `confirmed | cancelled | completed | no_show`
- `managementTokenHash`, customer reschedule count, merchant edit timestamps
- append-only `events[]`

### Capacity-safe atomic booking

The confirmed-booking partial unique index is:

```js
{ shopId: 1, ruleId: 1, slotKey: 1, slotPosition: 1 }
unique where { status: 'confirmed' }
```

For capacity `N`, the service attempts positions `0..N-1`. MongoDB arbitrates each position. Concurrent customers can fill different positions but cannot exceed capacity. Cancelling or moving a confirmed booking releases its position.

## Scheduling policy

A selected date/time must be generated from the stored rule and pass date bounds, recurring or exception hours, store-local elapsed-slot protection, minimum notice, booking window, and remaining capacity.

Direct one-off services can have no recurring weekday schedule when at least one open availability exception exists.

## v0.3.1 migration

On startup:

- old `sourceType=product` rules receive `bookingSource=product`;
- old `sourceType=standalone` rules receive `bookingSource=direct`;
- missing `serviceTitle` is copied from the legacy `productTitle` field;
- legacy `serviceType=product` becomes `appointment`;
- the old product uniqueness index is replaced by `one_appointment_service_per_product` for non-empty `productId` values.

## Merchant onboarding state

`Shop.onboarding` stores only setup progress timestamps. The App Block is required when a service uses the product-page booking source. Direct-only services can continue without theme editing. Services configured with `both` retain the App Block setup requirement because their product-page channel is active.
