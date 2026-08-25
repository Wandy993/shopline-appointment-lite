# Data model

All collections live in the logical database selected by `MONGODB_DB_NAME` (default `shopline_appointment_lite`).

## Shop

One record per installed SHOPLINE store. In addition to OAuth/store metadata, it holds admin locale, store timezone, per-store Email Studio configuration, reserved plan information, and lightweight onboarding timestamps. OAuth tokens remain excluded from normal Mongoose query results.

## AppointmentRule

A rule represents an appointment **service**. Service category, booking entry point, and booking-time model are independent.

Important fields:

- `bookingSource`: `product | direct | both`
  - `product`: booking starts from the linked SHOPLINE product page/App Block
  - `direct`: booking starts from the hosted `/book/:ruleId` page
  - `both`: both entry points are enabled
- `sourceType`: legacy compatibility field (`product | standalone`); new code uses `bookingSource`
- `serviceType`: `appointment | in_store | onsite | consultation | class | other`
- `bookingMode`: `slot | all_day | multi_slot`
  - `slot`: one minute/hour start time generated from `duration + buffer`
  - `all_day`: one date with no customer-facing time selection; `capacity` is daily capacity
  - `multi_slot`: one Booking containing exactly `sessionsRequired` generated time-slot occurrences
- `sessionsRequired`: 2–12 when `bookingMode=multi_slot`
- `serviceTitle`: customer-facing appointment service name
- `productId`, `productTitle`, `productHandle`: optional SHOPLINE product binding, required for `bookingSource=product|both`
- `serviceDescription`
- `duration`, `buffer` — relevant to `slot` and `multi_slot`; all-day rules normalize buffer to 0
- `capacity`: 1–100 per time slot for `slot|multi_slot`, or per date for `all_day`
- `minimumNoticeMinutes`, `bookingWindowDays`
- `dateFrom`, `dateUntil`
- `weeklyAvailability[{ weekday, enabled, windows[{ start, end }] }]` — all-day mode uses the enabled weekday but not hourly windows
- `availabilityExceptions[{ date, closed, windows[] }]` — all-day mode uses open/closed date exceptions
- `location`, legacy free-text `staff`, `questionLabel`, `customQuestions`, `enabled`
- `staffAssignment.mode`: `none | any | customer_choice | fixed`
- `staffAssignment.staffIds[]`: managed `Staff` references eligible to deliver the service

The SHOPLINE product binding uses a partial unique index for non-empty `productId`, so one product maps to one Appointment Lite service while direct-only services can exist without a product.

## Booking

Bookings preserve a denormalized service snapshot so records remain understandable after a rule changes.

Important fields include:

- `bookingSource`, legacy `sourceType`, `serviceType`, `bookingMode`, optional `productId`
- `ruleId`, `productTitle` (denormalized service display title), `duration`, `buffer`, `timezone`, `location`, `staff`, `staffId`, `staffEmail`
- compatibility primary fields `date`, `time`, `slotKey`, `slotPosition`
- `occurrences[]` — canonical selected date/time occurrences for booking-mode-aware records; managed assignments snapshot `staffId` and `staffName` per occurrence
- customer name/email/optional phone/note/answers
- `status`: `confirmed | cancelled | completed | no_show`
- `managementTokenHash`, customer reschedule count, merchant edit timestamps
- append-only `events[]`

For `slot`, `occurrences.length = 1`. For `all_day`, the occurrence has a date and empty customer-facing time while the legacy primary `time` remains `00:00`. For `multi_slot`, `occurrences` contains every session selected by the customer.

## Staff

One record per managed team member in a SHOPLINE store.

Important fields:

- `shopId`
- `name`, optional `email`, optional `phone`
- `status`: `active | inactive`
- `weeklyAvailability[{ weekday, enabled, windows[{ start, end }] }]`
- `availabilityExceptions[{ date, closed, windows[] }]`

Staff availability is independent from service availability. A customer-facing occurrence is bookable only when the service schedule, service capacity, and the chosen/assigned staff schedule all allow it. Staff records are tenant-scoped and can be assigned to multiple services.

## StaffReservation

`StaffReservation` is the v0.5.0 conflict ledger for managed staff. It stores:

```js
{ shopId, staffId, ruleId, slotKey, date, bookingMode, bucketKeys[], bookingIds[] }
```

Timed occurrences are normalized into five-minute `bucketKeys`. A unique multikey index on `{ shopId, staffId, bucketKeys }` prevents the same staff member from overlapping across different services. A second unique occurrence index lets one staff member serve multiple customers in the **same** service occurrence when that service has group capacity.

For `multi_slot`, all occurrences are tested against one candidate staff member before the Booking succeeds. Cancellation, completion, no-show, or merchant reassignment releases/updates the corresponding staff reservations.

## BookingReservation

`BookingReservation` is the v0.4.0 capacity ledger. It gives every active occurrence an independently reserved capacity position:

```js
{ shopId, ruleId, bookingId, bookingMode, date, time, slotKey, slotPosition }
```

Unique index:

```js
{ shopId: 1, ruleId: 1, slotKey: 1, slotPosition: 1 }
```

For capacity `N`, each occurrence attempts positions `0..N-1`. MongoDB arbitrates the unique positions. A multi-session Booking is created only after every selected occurrence has been reserved; if one session is full, reservations already obtained for that attempted Booking are cleaned up and the Booking is rejected. Cancelling, completing, or marking no-show releases all occurrence reservations.

The legacy Booking-level confirmed-slot index remains for compatibility and the primary occurrence; `BookingReservation` is authoritative for all occurrences introduced by booking modes.

## Scheduling policy

- `slot`: selected date/time must be generated from weekly/special hours and pass elapsed-time, minimum-notice, booking-window, date-bound, and capacity checks.
- `all_day`: the date must be enabled by weekly/date-exception policy and pass date bounds, day-level minimum notice, booking window, and daily capacity.
- `multi_slot`: every selected occurrence must independently pass the `slot` rules, selections must be unique, and count must exactly equal `sessionsRequired`.

Direct one-off services can have no recurring weekday schedule when at least one open availability exception exists.

## v0.5.0 migration

On startup, existing appointment rules without `staffAssignment` receive:

```js
{ mode: 'none', staffIds: [] }
```

Legacy free-text `staff` labels and historical bookings are preserved. Existing services are therefore not forced into managed staff scheduling after upgrade. Merchants opt individual services into `any`, `customer_choice`, or `fixed` mode from the service editor.

## v0.4.0 migration

On startup:

- existing rules without `bookingMode` become `slot` and receive the default `sessionsRequired=3` compatibility value;
- existing bookings without `bookingMode` become `slot`;
- existing confirmed bookings receive a one-occurrence `occurrences[]` snapshot if missing;
- active legacy bookings are backfilled into `BookingReservation` using their existing `slotPosition`, preserving capacity already in use.

This migration does not convert existing services to all-day or multi-session automatically.

## Merchant onboarding state

`Shop.onboarding` stores only setup progress timestamps. The App Block is required when a service uses the product-page booking source. Direct-only services can continue without theme editing. Services configured with `both` retain the App Block setup requirement because their product-page channel is active.
