# Order lifecycle and SHOPLINE locations

Appointment Lite v0.6.5 connects purchase-first scheduling operations to the SHOPLINE order lifecycle and reuses locations already managed in SHOPLINE Admin.

## Required SHOPLINE scopes

The app requests read-only access for the data it consumes:

- `read_orders` — order/payment reconciliation and order-linked scheduling.
- `read_location` — list SHOPLINE store locations for service configuration.

Appointment Lite does not request `write_orders`, `read_inventory`, or `write_inventory` for this feature. Inventory quantities are not needed to choose a service location.

Existing installations must reauthorize after `read_location` is enabled in the SHOPLINE app permission configuration.

## Order lifecycle rows

`product_post_purchase` rules create or update a `PostPurchaseEntitlement` from SHOPLINE order webhooks. Bookings merges these entitlements with normal Booking documents so merchants can see work before the customer has scheduled a time.

The UI intentionally keeps two dimensions separate:

| Payment | Appointment | Meaning |
| --- | --- | --- |
| Unpaid | Waiting for payment | Matching SHOPLINE order exists but is not paid. |
| Paid | Awaiting scheduling | Payment is complete and the customer has not booked yet. |
| Paid | Partially scheduled | A multi-quantity purchase still has unused appointment entitlement. |
| Paid | Scheduled | The appointment is represented by the confirmed Booking row. |
| Unpaid/Paid | Cancelled | Remaining entitlement was revoked by order cancellation. |

For `standalone_paid`, the Booking already exists as `pending_payment` before checkout. When SHOPLINE creates the order, the order ID/name is attached to that Booking; payment then confirms the same record.

### Reconciliation

Webhooks remain the primary source. `POST /api/admin/commerce/reconcile` also fetches recent SHOPLINE orders with `status=any` and backfills both paid and unpaid purchase-first lifecycle rows. Reauthorization runs the same recent-order reconciliation best-effort.

## Service location modes

Appointment rules support:

- `shopline_location` — select a location created in SHOPLINE Admin.
- `customer_address` — collect the delivery/service address from the customer. For purchase-first scheduling, the SHOPLINE shipping address is prefilled when present.
- `online` — no physical address is required.
- `custom` — merchant-entered one-off location text.

### SHOPLINE location snapshots

A rule using `shopline_location` stores:

- `shoplineLocationId`
- `locationSnapshot`
- a formatted `location` display string

A Booking copies that snapshot at creation time. This prevents an old appointment from silently changing when a merchant later edits or removes the SHOPLINE location.

If a selected SHOPLINE location is removed before the service is saved again, the editor asks the merchant to refresh locations and choose a current location rather than silently switching to another one.
