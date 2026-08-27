# Post-purchase Appointment

Appointment Lite v0.6.3 activates `product_post_purchase` for services that should be scheduled only after a customer has bought a linked SHOPLINE product. Typical uses include furniture installation, equipment setup, delivery onboarding, after-sales service, or any appointment included with a purchase.

## Customer flow

```text
SHOPLINE product purchase
  -> order/payment webhooks
  -> matching paid order entitlement
  -> private scheduling email
  -> customer chooses date/time/staff
  -> Appointment Lite confirmed booking
  -> normal customer/staff/merchant notifications
  -> Business Google Calendar sync (when connected)
```

There is no Appointment Lite booking button on the product page for this mode. The merchant keeps the normal SHOPLINE Add to cart / Buy now experience.

## Eligibility

A service is eligible when an enabled `product_post_purchase` AppointmentRule is bound to a product contained in the SHOPLINE order. The order line-item quantity becomes the appointment quota:

- quantity 1 -> one appointment
- quantity 2 -> two appointments
- quantity N -> N appointments (capped at the model safety limit)

Appointment Lite upserts one `PostPurchaseEntitlement` per store + rule + order. An unpaid order remains `pending_payment`; confirmed payment activates the entitlement. Delivery order between `orders/create` and `order_transactions/create` is tolerated through `WebhookReceipt` reconciliation.

## Private scheduling link

When the entitlement becomes active, Appointment Lite creates a 32-byte random URL-safe token and stores only its SHA-256 hash. The buyer receives a branded email containing:

`/book/<ruleId>?access=<private-token>`

The hosted booking service and availability endpoints require this token. The order customer name/email/phone are prefilled, and the order email is treated as the booking identity. The token is not returned from normal service payloads.

If delivery fails transiently, the background retry scheduler re-attempts the scheduling email without requiring another SHOPLINE webhook.

## Booking and quota behavior

Creating a booking atomically claims one unit of entitlement quota before normal slot/staff capacity is committed. If booking creation fails, the quota claim is rolled back. A successful booking is attached to the entitlement and snapshots the SHOPLINE order ID/name.

If the customer or merchant later cancels that Appointment Lite booking, its entitlement quota is restored once. If the SHOPLINE order has already been revoked, the entitlement remains revoked.

## Order cancellation

`orders/cancelled` revokes unused private scheduling access. Already confirmed Appointment Lite bookings are intentionally not auto-cancelled in v0.6.3: merchants may need to coordinate refunds, service completion, or exceptional fulfillment before cancelling an operational appointment.

## Notifications and calendar

The post-purchase schedule-link email is operational delivery of an included service and is independent from the normal booking-confirmation toggle. Once the customer actually schedules, the resulting Booking uses the same notification, staff assignment, reminder, management-link, and Business Google Calendar lifecycle as every other confirmed Appointment Lite booking.

## Current boundaries

- Core eligibility is driven by SHOPLINE order/payment/cancellation webhooks.
- Refund-specific entitlement reconciliation and order-edit quantity adjustments are not automatic in v0.6.3.
- Existing confirmed appointments are not automatically cancelled when the underlying SHOPLINE order is cancelled.
- One Appointment Lite service rule per bound product remains the current product model.
