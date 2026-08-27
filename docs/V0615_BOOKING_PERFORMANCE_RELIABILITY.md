# Appointment Lite v0.6.15 — Booking Performance & Reliability

v0.6.15 focuses on the customer booking path and recovery behavior instead of adding a new booking feature.

## Storefront availability performance

- Adds a four-second in-process cache for public service/shop context so the booking page and availability endpoint do not repeatedly reload the same rule and shop document during one customer interaction.
- Adds single-flight coalescing for identical availability requests. If the hosted page, Theme App Block, or prefetch logic requests the same service/date/staff combination at the same time, the server performs the MongoDB availability calculation once and shares the result.
- Adds dedicated compound indexes for booking capacity and staff availability reads.
- Excludes admin-soft-deleted legacy booking rows from public availability calculations.
- Emits `Server-Timing` and `X-Appointment-Availability-Ms` headers and logs availability requests that take 1.5 seconds or longer for production diagnosis.

The booking write path still performs its own atomic capacity checks. The short-lived read optimization never replaces conflict protection during booking creation.

## Storefront network resilience

- Hosted booking and Theme App Block GET requests now have an eight-second timeout.
- GET requests retry once after transient network errors, HTTP 429, or HTTP 5xx responses.
- Booking/checkout POST requests are not automatically retried, preventing accidental duplicate appointment submissions.
- The animated availability overlay waits 180ms before appearing, so quick cached or prefetched responses no longer cause unnecessary loading flashes.

## SHOPLINE order recovery

- Pending-order reconciliation is isolated per shop/chunk. A temporary SHOPLINE failure for one merchant no longer prevents the scheduler from checking other merchants.
- Adds a bounded recent-order recovery sweep every 15 minutes for active shops with `read_orders` permission. The sweep checks the latest two days / 50 orders per shop (up to 25 recently active shops per sweep) to recover from a missed `orders/create` or `orders/paid` webhook.
- Existing manual reconciliation and webhook processing remain unchanged and idempotent.

## External-service reliability

- Read-only SHOPLINE OpenAPI and GraphQL requests retry once for transient 429/500/502/503/504 failures or network timeouts.
- Google Calendar background sync retries with bounded delays of 0s, 1.5s, and 5s before leaving the booking in its existing calendar error state.
- Calendar synchronization remains asynchronous and never blocks a successfully committed appointment.

## Operational safety

This release deliberately does not retry booking-creation POST requests or email sends automatically. Retrying non-idempotent operations after an unknown network result can create duplicate bookings or duplicate customer emails.
