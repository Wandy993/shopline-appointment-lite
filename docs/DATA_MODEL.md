# Data model

All collections live in the logical database selected by `MONGODB_DB_NAME` (default `shopline_appointment_lite`).

## Shop

One record per installed SHOPLINE store. In addition to OAuth/store metadata, it holds admin locale, store timezone, per-store Email Studio configuration and lightweight onboarding timestamps. OAuth tokens remain excluded from normal Mongoose query results.

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
- `avatar { kind: preset | custom | initials, value }` — public-facing profile presentation; custom images are compressed before storage
- `roleTitle`, `region`, `expertise`, `bio`, `publicProfile` — optional customer-facing profile metadata
- `supportedServices[]` — merchant-entered display labels shown in the public staff list; these labels do not control service assignment or availability
- `notifications { emailEnabled }` — explicit opt-in for assignment/update/reassignment/cancellation emails
- `status`: `active | inactive`
- `weeklyAvailability[{ weekday, enabled, windows[{ start, end }] }]`
- `availabilityExceptions[{ date, closed, windows[] }]`

Staff availability is independent from service availability. A customer-facing occurrence is bookable only when the service schedule, service capacity, and the chosen/assigned staff schedule all allow it. Staff records are tenant-scoped and can be assigned to multiple services. Public staff-choice responses expose only safe profile fields (`id`, `name`, avatar, optional public profile metadata, and `supportedServices[]`); contact data and notification settings stay admin-only.

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


## v0.5.1 staff profile compatibility

Staff records created before v0.5.1 continue to work without migration. Missing avatar data renders with the default `aurora` preset. Missing `notifications.emailEnabled` is treated as disabled so an upgrade cannot unexpectedly start sending employee emails.


## v0.6.0.3 notification and calendar records

### Merchant email recipients

`Shop.emailSettings` stores a primary merchant notification inbox, optional additional inboxes, and independent switches for new bookings, changes, and cancellations. These are ordinary email addresses; no Google account is required. Provider credentials remain environment-level secrets and are never stored per shop.

### Staff notification email

`Staff.email` plus `Staff.notifications.emailEnabled` controls assignment lifecycle messages. Staff do not need a SHOPLINE admin account or Google authorization. Booking snapshots keep `staffEmail` only as the assignment-time operational snapshot.

### CalendarConnection

The merchant-facing calendar model uses one `connectionType=business` Google connection per store. It has `staffId=null` and receives confirmed appointments across all staff. `calendarId`, `calendarName`, `calendarTimeZone`, and encrypted `refreshTokenEncrypted` are stored server-side; refresh tokens remain `select:false`.

Legacy `connectionType=staff` records from v0.6.0/v0.6.0.1 remain schema-compatible but are no longer offered by the merchant UI and are ignored by booking reconciliation. New staff OAuth connection routes return `410 STAFF_GOOGLE_CALENDAR_RETIRED`.

Customer guest invitations are disabled by live synchronization. `Booking.calendarEvents[]` maps the business connection to Google event IDs and occurrence keys so retries, reschedules, and cancellations are idempotent.

### Customer calendar links

Customer-facing confirmation surfaces expose one **Add to Google Calendar** link generated from the canonical booking snapshot. The signed `.ics` route remains available internally for backward compatibility, but v0.6.0.3 no longer presents it as a customer download button.


## v0.6.3 booking commerce lifecycle

`AppointmentRule.commerceMode` remains one of:

- `standalone_free`
- `standalone_paid`
- `product_pre_purchase`
- `product_post_purchase`

The field is independent from `bookingSource`, and `Booking.commerceMode` snapshots the rule value so historical records retain their commercial context. `standalone_paid` and `product_post_purchase` are both active. Purchase-first rules are forced to `bookingSource=direct` internally because their hosted scheduling page is reachable only from a private paid-order link, not from a public pre-purchase button.

Paid appointment rules additionally store `productVariantId`, variant title/price snapshots, and `paymentHoldMinutes` (5–30). A paid Booking starts as `pending_payment` and stores `payment.holdExpiresAt`, checkout start time, SHOPLINE order identity/financial status, and the last webhook ID. Normal `BookingReservation` and `StaffReservation` rows are created before checkout, so pending payment consumes capacity exactly like a confirmed appointment until the hold expires.

Paid status transitions are:

```text
pending_payment -> confirmed
pending_payment -> payment_expired
payment_expired -> payment_conflict   (late payment)
```

`payment_expired` releases all appointment/staff reservations. A payment that arrives after release is recorded as `payment_conflict` instead of being auto-confirmed, because the capacity may already have been sold to another customer.

`WebhookReceipt` stores the unique SHOPLINE webhook ID, topic, store ID, external order ID, processing status, and error metadata. This makes webhook retries idempotent and lets `orders/create` / `order_transactions/create` close the payment race regardless of delivery order.


### PostPurchaseEntitlement

`PostPurchaseEntitlement` is the paid-order eligibility record for `product_post_purchase` services. It is unique by `{ shopId, ruleId, orderId }` and stores the matching SHOPLINE product/order identity, order customer snapshot, purchased quantity, consumed booking count, linked Booking IDs, payment/order state, and notification health.

- `eligibleQuantity` — appointment quota from the SHOPLINE line-item quantity.
- `usedBookings` — atomically claimed quota while creating appointments.
- `status` — `pending_payment`, `active`, `exhausted`, or `revoked`.
- `tokenHash` — SHA-256 of the private schedule token and `select:false`.
- `notificationSentAt` / retry metadata — protects and retries private schedule-link delivery.

`Booking.postPurchase` snapshots `entitlementId`, `shoplineOrderId`, and `shoplineOrderName`. Customer/merchant cancellation restores quota only once by removing the Booking ID from the entitlement.
