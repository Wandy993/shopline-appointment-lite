# SHOPLINE order sync

Appointment Lite v0.6.5 uses SHOPLINE order data to confirm paid standalone bookings and activate purchase-first scheduling links.

## Permission

The app requests **read_orders** only. It does not request `write_orders` because Appointment Lite does not edit or mutate SHOPLINE orders. Existing merchants must authorize the added order-read scope once after the app permission is enabled.

## Payment confirmation

The primary real-time signal is the `orders/paid` webhook. `orders/create` is also consumed so the booking/order mapping can be stored as soon as an order exists, while `order_transactions/create` is retained only as a compatibility fallback.

## Reconciliation

Real-world webhooks can be delayed or missed during scope changes, deploys, or network interruptions. The background scheduler checks pending order IDs against the SHOPLINE Orders API, and the admin can run a recent paid-order reconciliation on demand. After a scope reauthorization, Appointment Lite also reconciles recent paid orders automatically.

## Safety

A paid standalone booking still respects the checkout hold. If payment is discovered only after the hold expired and the slot was released, the booking moves to `payment_conflict` instead of silently taking a time that may have been booked by someone else.
