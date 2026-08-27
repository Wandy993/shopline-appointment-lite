# Paid Booking Flow

Appointment Lite v0.6.2 activates `standalone_paid` services with SHOPLINE checkout while keeping Appointment Lite as the scheduling source of truth.

## Customer flow

1. The customer chooses the appointment date/time, staff member, and booking details in Appointment Lite.
2. Appointment Lite atomically reserves every selected occurrence and creates a Booking with `status=pending_payment`.
3. The reservation is held for the service's configured `paymentHoldMinutes` (5–30 minutes; default 15).
4. Appointment Lite redirects the customer to a SHOPLINE permanent cart/checkout link for the configured product variant.
5. The cart line carries a hidden `_appointment_lite_booking` property that maps the SHOPLINE order back to the held Booking.
6. SHOPLINE payment/order webhooks confirm the Booking only after payment is reported successful.
7. Customer/staff email notifications and Business Google Calendar sync run only after the Booking becomes `confirmed`.

Appointment Lite does not confirm a paid appointment merely because checkout was opened.

## Hold lifecycle

Paid bookings use these states:

- `pending_payment` — the selected capacity is reserved while the customer pays.
- `confirmed` — SHOPLINE reported payment success while the hold was still valid.
- `payment_expired` — payment was not confirmed before the hold expired; capacity was released.
- `payment_conflict` — payment arrived after the hold had already been released. The Booking is not silently confirmed because the slot may have been sold to another customer; merchant review is required.

A lightweight scheduler checks expired holds every minute. BookingReservation and StaffReservation rows are released when a hold expires.

## SHOPLINE checkout mapping

The paid service stores one SHOPLINE checkout variant ID and price snapshot. Appointment Lite creates a permanent cart link using the store handle and variant/SKU identifier. The line-item properties include:

```json
[
  { "name": "_appointment_lite_booking", "value": "BOOKING_OBJECT_ID", "roleVisibility": "none" },
  { "name": "Appointment", "value": "2026-08-28 14:00 · Asia/Shanghai", "roleVisibility": "all" },
  { "name": "Staff", "value": "Sarah", "roleVisibility": "all" }
]
```

The booking customer email/phone are also prefilled into checkout when available.

## Webhooks

Appointment Lite uses one raw-body webhook endpoint:

```text
POST /webhooks/shopline
```

Required topics:

- `orders/create`
- `order_transactions/create`

When a merchant saves a paid appointment service, Appointment Lite lists existing subscriptions and creates only the missing required topics for `${APP_URL}/webhooks/shopline`.

Webhook processing:

- validates `X-Shopline-Hmac-Sha256` against the raw request body using the SHOPLINE app secret;
- accepts both hexadecimal and base64 digest representations for compatibility;
- stores `X-Shopline-Webhook-Id` in `WebhookReceipt` so retries/duplicates are idempotent;
- records the external order ID so `order_transactions/create` and `orders/create` can arrive in either order;
- validates the installed store before mutating a Booking.

A legitimate event that does not belong to Appointment Lite is acknowledged and ignored. Processing failures return a non-2xx response so SHOPLINE can retry.

## Merchant configuration

For **Standalone · payment required**:

1. Create or select a SHOPLINE product that represents the paid appointment.
2. Select the product variant used at checkout.
3. Choose a payment hold window between 5 and 30 minutes.
4. Configure the service schedule/staff/capacity normally.
5. Save the service. Appointment Lite best-effort provisions the required SHOPLINE webhook subscriptions.

A dedicated appointment product is recommended so its price/title are easy for the customer to understand at checkout.

## Safety and current boundary

- No Appointment Lite confirmation email or Google Calendar event is sent before payment confirmation.
- A late payment after hold release is surfaced as `payment_conflict` rather than risking double booking.
- Automatic refunds/manual conflict resolution are not part of v0.6.2.
- SHOPLINE's hosted checkout/thank-you page remains the post-payment browser destination; Appointment Lite confirmation happens asynchronously from webhooks.
- `product_post_purchase` is activated in v0.6.3; see `POST_PURCHASE_APPOINTMENTS.md` for the paid-order entitlement and private scheduling flow.
