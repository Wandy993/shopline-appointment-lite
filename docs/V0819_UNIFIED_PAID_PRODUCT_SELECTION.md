# Appointment Lite v0.8.19 — Unified paid product selection

## Merchant problem

For a paid appointment using a SHOPLINE product detail App Block, merchants previously had to choose a **checkout product** in Booking model and then choose the **same product again** under Product page coverage. Those selections are technically separate but normally refer to the same product. Merchants could also mistakenly select All products and expose a paid service on unrelated product pages.

## Behavior

- When a merchant chooses **Pay during booking**, selects the SHOPLINE checkout product and its variant, then enables **Product detail App Block**, the checkout product is automatically selected as the **only** product page showing that service.
- Step 2 shows a concise confirmation of the linked product rather than requiring a second picker.
- **Customize display pages** reveals the original All products / Selected products options for advanced use cases (cross-promotion, multiple landing products).
- **Use checkout product** restores the one-product default.
- If the checkout product changes while auto-linking is active, its linked display page changes along with it.
- If the merchant has explicitly customized product placement, changing the checkout product does **not** override the customized display product set.
- Editing an existing paid service with a distinct display-product setup preserves its stored configuration. Existing same-product placements use the concise linked-product view.
- Free standalone services and purchase-triggered services keep their existing storefront placement behavior. No backend schema or checkout contract change.

## Merchant-facing explanation

**Checkout product**: product and variant charged through SHOPLINE checkout.

**Display product**: product detail pages where the App Block is allowed to appear. For paid appointments the checkout product is the default, but advanced merchants can deliberately show a service on other product pages without changing the product charged.

**Purchase-trigger products**: items purchased first that grant access to scheduling afterward; these do not serve as public App Block display products.

## Safety and verification

- No automatic writes or migration of merchant records.
- UI computes `storefrontPlacement.productBlock` using the existing backend data contract.
- Tests exercise automatic linking, checkout-product changes, advanced overrides, free/post-purchase modes, and source/UI invariants.
- Theme runtime version marker updated for consistent release/cache identity. The logic change is confined to the merchant admin.

## Release validation

Run `npm ci`, `npm run check`, `npm test`; merge only after CI passes. Then verify that Railway deploys and perform a manual browser check in both Chinese and English, including the advanced display-product case.
