# HTTP API summary

All responses are JSON except `/`, `/app`, `/book/:ruleId`, and OAuth browser redirects.

## Health and OAuth

- `GET /health`
- `GET /auth/install` — signed SHOPLINE installation request
- `GET /auth/callback` — signed OAuth code callback
- `GET /app` — authenticated merchant admin shell
- `GET /book/:ruleId` — public hosted booking page for an enabled standalone service

## Admin API

Requires the signed `al_session` HTTP-only cookie. Mutations also require `X-CSRF-Token` from bootstrap.

- `GET /api/admin/bootstrap`
- `GET /api/admin/products`
- `GET /api/admin/rules` — includes a `bookingUrl` for standalone services
- `POST /api/admin/rules`
- `PUT /api/admin/rules/:id`
- `DELETE /api/admin/rules/:id`
- `GET /api/admin/bookings?status=confirmed|cancelled|completed|no_show&ruleId=...&from=YYYY-MM-DD&to=YYYY-MM-DD` — max 1000 records; the admin UI also applies client-side text search and CSV export
- `PUT /api/admin/bookings/:id` — merchant date/time/location/staff edit
- `POST /api/admin/bookings/:id/cancel` — merchant cancellation
- `POST /api/admin/bookings/:id/status` — merchant lifecycle update to `completed` or `no_show`
- `PUT /api/admin/preferences` — saves merchant admin language (`en` or `zh-CN`)
- `GET /api/admin/storefront/deep-link` — product-template App Block editor URL or safe theme fallback
- `PUT /api/admin/onboarding` — Quickstart progress
- `POST /api/admin/email/test` — sends to the merchant-supplied test recipient only
- `PUT /api/admin/email/settings` — per-store email branding, routing, and message templates

## Public booking API

### Product App Block flow

- `GET /api/public/rule?shopId=STORE_ID&productId=PRODUCT_ID`
- `GET /api/public/availability?shopId=STORE_ID&productId=PRODUCT_ID&date=YYYY-MM-DD`
- `POST /api/public/bookings` with `shopId`, `productId`, date/time, and customer fields

### Standalone service flow

- `GET /api/public/service?ruleId=RULE_ID`
- `GET /api/public/availability?ruleId=RULE_ID&date=YYYY-MM-DD`
- `POST /api/public/bookings` with `ruleId`, date/time, and customer fields

Both flows use the same scheduling engine. Availability is `no-store`, filters elapsed/policy-blocked dates, and removes a slot only after its configured capacity is full.

Standalone example:

```json
{
  "ruleId": "66c6f3c1f24f1e9a00112233",
  "date": "2026-09-12",
  "time": "10:00",
  "customer": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555 0100"
  },
  "note": "Please call before arrival",
  "answers": [
    { "question": "Service address", "answer": "18 Example Street" }
  ]
}
```

### Customer management API

- `POST /api/public/bookings/:id/status` — token-authenticated full status; legacy product receipts retain their restricted compatibility lookup
- `POST /api/public/bookings/:id/availability` — token-authenticated reschedule availability
- `POST /api/public/bookings/:id/reschedule` — one customer self-service reschedule
- `POST /api/public/bookings/:id/cancel` — customer cancellation

Scheduling-policy failures return `422 SLOT_UNAVAILABLE`. A slot that loses its final capacity position during a concurrent insert returns `409 SLOT_CONFLICT`.
