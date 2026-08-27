# HTTP API summary

All responses are JSON except `/`, `/app`, `/book/:ruleId`, and OAuth browser redirects.

## Health and OAuth

- `GET /health`
- `GET /auth/install` — signed SHOPLINE installation request
- `GET /auth/callback` — signed OAuth code callback
- `GET /app` — authenticated merchant admin shell
- `GET /book/:ruleId` — public hosted booking page for an enabled service with `bookingSource=direct|both`
- `GET /integrations/google/callback` — Google OAuth callback protected by signed short-lived state
- `GET /integrations/google/complete` — no-store OAuth completion popup used to refresh the merchant Calendar Sync workspace

## Admin API

Requires the signed `al_session` HTTP-only cookie. Mutations also require `X-CSRF-Token` from bootstrap.

- `GET /api/admin/bootstrap`
- `GET /api/admin/products`
- `GET /api/admin/rules` — includes `serviceType`, `bookingSource`, `bookingMode`, `serviceTitle`, `staffAssignment`, per-service booking count, and a `bookingUrl` for `direct|both` services
- `POST /api/admin/rules`
- `PUT /api/admin/rules/:id`
- `DELETE /api/admin/rules/:id`
- `GET /api/admin/staff` — team members plus appointment services currently assigned to each member
- `POST /api/admin/staff` — create a staff member with weekly hours and availability exceptions
- `PUT /api/admin/staff/:id` — edit contact details, status, and availability; deactivation is blocked while active bookings or service assignments remain
- `DELETE /api/admin/staff/:id` — delete only after confirmed bookings are resolved and the member is removed from assigned services
- `GET /api/admin/bookings?status=pending_payment|confirmed|cancelled|completed|no_show|payment_expired|payment_conflict&ruleId=...&staffId=...&from=YYYY-MM-DD&to=YYYY-MM-DD` — max 1000 records; the admin UI also applies client-side text search and CSV export
- `PUT /api/admin/bookings/:id` — merchant date/time/location/staff edit for minute/hour bookings; managed staff reassignment is conflict-checked before the old assignment is released
- `POST /api/admin/bookings/:id/cancel` — merchant cancellation
- `POST /api/admin/bookings/:id/status` — merchant lifecycle update to `completed` or `no_show`
- `PUT /api/admin/preferences` — saves merchant admin language (`en` or `zh-CN`)
- `GET /api/admin/storefront/deep-link` — product-template App Block editor URL or safe theme fallback
- `PUT /api/admin/onboarding` — Quickstart progress
- `POST /api/admin/email/test` — sends to the merchant-supplied test recipient only
- `PUT /api/admin/email/settings` — per-store email branding, routing, and message templates
- `GET /api/admin/calendar` — merchant-facing Business Google Calendar status only
- `GET /api/admin/calendar/google/store/connect` — returns a short-lived OAuth URL for the store Business Calendar
- `GET /api/admin/calendar/google/store/calendars` — lists calendars owned by the connected merchant account
- `PUT /api/admin/calendar/google/store` — selects the store calendar
- `POST /api/admin/calendar/google/store/sync` — reconciles upcoming confirmed appointments into the Business Calendar
- `DELETE /api/admin/calendar/google/store` — revokes/deletes the Business Calendar connection
- `/api/admin/calendar/google/:staffId/*` — retired compatibility routes; return `410 STAFF_GOOGLE_CALENDAR_RETIRED`

## Public booking API

### Product App Block flow

- `GET /api/public/rule?shopId=STORE_ID&productId=PRODUCT_ID`
- `GET /api/public/availability?shopId=STORE_ID&productId=PRODUCT_ID&date=YYYY-MM-DD&staffId=STAFF_ID` — `staffId` is used for customer-choice staffing; multi-session clients may also send `selected=YYYY-MM-DDTHH:mm,...` so remaining slots stay compatible with one staff member across the bundle
- `POST /api/public/bookings` with `shopId`, `productId`, customer fields, and the selection required by the rule's `bookingMode`

### Hosted booking-page flow

- `GET /api/public/service?ruleId=RULE_ID`
- `GET /api/public/availability?ruleId=RULE_ID&date=YYYY-MM-DD&staffId=STAFF_ID` — same staff-aware availability behavior as the product flow
- `POST /api/public/bookings` with `ruleId`, customer fields, and the selection required by `bookingMode`
- `POST /api/public/paid-bookings` — for `standalone_paid` only; validates the same selection/customer payload, reserves capacity as `pending_payment`, and returns `checkoutUrl` plus `holdExpiresAt` instead of a confirmed booking token

Paid bookings are finalized asynchronously by the raw-body SHOPLINE webhook endpoint `POST /webhooks/shopline`, which handles `orders/create` and `order_transactions/create`. The endpoint verifies SHOPLINE HMAC headers and stores webhook IDs for idempotency.

Both flows use the same scheduling engine and the same Theme/hosted behavior. Availability is `no-store`, policy-aware, and capacity-aware.

### Booking-mode payloads

Minute/hour (`bookingMode=slot`):

```json
{
  "ruleId": "66c6f3c1f24f1e9a00112233",
  "date": "2026-09-12",
  "time": "10:00",
  "customer": { "name": "Jane Doe", "email": "jane@example.com", "phone": "+1 555 0100" },
  "staffId": "66c6f3c1f24f1e9a00445566",
  "note": "Please call before arrival",
  "answers": []
}
```

All day (`bookingMode=all_day`):

```json
{
  "ruleId": "66c6f3c1f24f1e9a00112233",
  "date": "2026-09-12",
  "customer": { "name": "Jane Doe", "email": "jane@example.com", "phone": "" },
  "note": "",
  "answers": []
}
```

The availability response contains `available`, `remaining`, and `capacity`; there is no time-slot selection.

Multiple sessions (`bookingMode=multi_slot`):

```json
{
  "ruleId": "66c6f3c1f24f1e9a00112233",
  "occurrences": [
    { "date": "2026-09-14", "time": "10:00" },
    { "date": "2026-09-16", "time": "10:00" },
    { "date": "2026-09-18", "time": "10:00" }
  ],
  "customer": { "name": "Jane Doe", "email": "jane@example.com", "phone": "" },
  "note": "",
  "answers": []
}
```

The number of occurrences must exactly match the service's `sessionsRequired`. Capacity is reserved atomically for every selected occurrence before the Booking is committed.


### Staff-aware booking behavior

A rule exposes `staffAssignment` and safe public `staffOptions`. Staff selection is independent from `serviceType`, `bookingSource`, and `bookingMode`:

- `none` — no managed staff resource is required.
- `any` — the server chooses one eligible staff member who can cover every occurrence.
- `customer_choice` — the customer must submit an allowed `staffId`; availability is filtered for that member.
- `fixed` — the configured member is chosen automatically.

Staff working hours and exceptions are intersected with service availability. Timed services consume `duration + buffer` from the staff schedule. Multi-session bookings keep one staff member for all selected occurrences. Overlaps across different services are rejected with `409 STAFF_CONFLICT`; a group-capacity occurrence of one service can share its staff reservation across customers.

### Customer management API

- `POST /api/public/bookings/:id/status` — token-authenticated full status; legacy product receipts retain their restricted compatibility lookup
- `POST /api/public/bookings/:id/availability` — token-authenticated reschedule availability for minute/hour bookings
- `POST /api/public/bookings/:id/reschedule` — one customer self-service reschedule for minute/hour bookings
- `POST /api/public/bookings/:id/cancel` — customer cancellation for all modes

Online rescheduling remains intentionally limited to `slot` bookings in v0.5.0. All-day and multi-session bookings can still be cancelled online and managed by the merchant.

Scheduling-policy failures return `422 SLOT_UNAVAILABLE`. A selection that loses its final capacity position during a concurrent reservation returns `409 SLOT_CONFLICT`.
