# HTTP API summary

All responses are JSON except `/`, `/app`, and OAuth browser redirects.

## Health and OAuth

- `GET /health`
- `GET /auth/install` — signed SHOPLINE installation request
- `GET /auth/callback` — signed OAuth code callback
- `GET /app` — authenticated admin shell

## Admin API

Requires the signed `al_session` HTTP-only cookie. Mutations also require `X-CSRF-Token` from bootstrap.

- `GET /api/admin/bootstrap`
- `GET /api/admin/products`
- `GET /api/admin/rules`
- `POST /api/admin/rules`
- `PUT /api/admin/rules/:id`
- `DELETE /api/admin/rules/:id`
- `GET /api/admin/bookings?status=confirmed|cancelled`
- `PUT /api/admin/bookings/:id` — merchant date/time/location/staff edit; invokes the optional customer email notification hook
- `POST /api/admin/bookings/:id/cancel`

## Public storefront API

- `GET /api/public/rule?shopId=STORE_ID&productId=ID` — five-minute public cache
- `GET /api/public/availability?shopId=STORE_ID&productId=ID&date=YYYY-MM-DD` — no-store
- `POST /api/public/bookings` — rate-limited; atomically confirms one slot and returns a one-time management token
- `POST /api/public/bookings/:id/status` — refresh full status using the management token; legacy receipts may request only `confirmed`/`cancelled` with matching store and product IDs
- `POST /api/public/bookings/:id/reschedule` — atomically move a confirmed booking using the management token; limited to one customer-initiated change
- `POST /api/public/bookings/:id/cancel` — cancel a confirmed booking using the management token

Example body:

```json
{
  "shopId": "1672369729606",
  "productId": "16050375155238626683133099",
  "date": "2026-08-24",
  "time": "10:00",
  "customer": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555 0100"
  },
  "note": "Wedding fitting",
  "answers": [
    { "question": "Preferred style?", "answer": "Minimal" }
  ]
}
```

Expected conflict response:

```json
{
  "error": "SLOT_CONFLICT",
  "message": "This time was just booked. Please choose another slot."
}
```
