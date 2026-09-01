# Appointment Lite v0.8.1 — Booking Model & Storefront Placement Refactor

## Goal

v0.8.1 separates four concepts that were previously coupled through `productId`, `bookingSource`, and `commerceMode`:

1. **Booking business type** — whether a customer can book independently or only after purchasing an eligible product.
2. **Payment mode** — whether an independent appointment is free or paid during booking.
3. **Purchase eligibility** — which SHOPLINE products create post-purchase appointment entitlement.
4. **Storefront placement** — where a standalone appointment can be discovered and launched.

Legacy fields remain as compatibility snapshots so existing bookings, checkout flow, order webhooks, and older records continue to work during migration.

## New booking model

### Standalone booking

Customers can book without first purchasing a specific SHOPLINE product.

Payment options:

- `none` — booking confirms directly.
- `checkout` — the customer selects a time first, then pays through a dedicated SHOPLINE checkout product/variant.

The checkout product is only a billing resource. It is not used to decide where the appointment appears in the storefront.

### Purchase-triggered booking

The customer must first pay for one of the configured trigger products. A paid order creates appointment entitlement and the customer receives the existing private order scheduling link.

Public storefront placement is disabled for purchase-triggered services so a storefront entry cannot bypass purchase eligibility.

## Storefront placement

Standalone services can independently enable:

- Direct hosted booking link.
- Regular Page App Block.
- Staff Directory App Block.
- Product detail App Block.
  - All products.
  - Selected products.
- App Embed floating launcher.

Product placement is presentation only. A display product does not become a trigger product or checkout product.

## App Embed

The new `Appointment Lite Launcher` is a SHOPLINE Theme App Extension App Embed Block with `target: body`.

When enabled by the merchant in the theme editor, it loads all active standalone services where `storefrontPlacement.appEmbed.enabled=true` and displays a floating appointment launcher. If multiple services are enabled, customers choose a service before continuing to the hosted booking experience.

SHOPLINE App Embed Blocks are not auto-enabled by installation. Merchants must enable the block from the theme editor App embeds area.

## Migration

At startup v0.8.1 migrates legacy rules:

- `standalone_free` → `bookingType=standalone`, `paymentMode=none`.
- `standalone_paid` → `bookingType=standalone`, `paymentMode=checkout` and `checkoutProduct` snapshot.
- `product_pre_purchase` → standalone booking with Product App Block placement on the previous linked product.
- `product_post_purchase` → `bookingType=purchase_triggered` with the previous product as a trigger product.

The old one-service-per-product unique index is removed because storefront placement and product eligibility are no longer one-to-one relationships.

## Compatibility fields

The following fields remain temporarily:

- `bookingSource`
- `commerceMode`
- `sourceType`
- `productId`
- `productTitle`
- `productHandle`
- `productVariantId`
- `productVariantTitle`
- `productVariantPrice`

They are derived from the new model when a rule is saved and keep older runtime paths compatible while v0.8.1 progressively moves reads to the new fields.
