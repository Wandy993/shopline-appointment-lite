# Appointment Lite v0.7.0 — SHOPLINE Subscription Integration

## Release scope

Appointment Lite v0.7.0 connects the app to SHOPLINE application subscriptions using one paid application plan:

- Plan: **Appointment Lite Pro**
- Price: **USD 5.99 / month**
- Trial: **7 days**, configured and enforced in SHOPLINE Partner Center
- Free plan: **none**
- Annual billing: **not enabled in this release**

Appointment Lite does **not** create or maintain a second local trial clock. SHOPLINE is the source of truth for trial eligibility, subscription state, renewal, payment, and expiry. The local database only caches the latest state needed for fast access control and merchant UI.

## Important rollout rule

`SHOPLINE_SUBSCRIPTION_ENABLED` defaults to `false`.

Keep it disabled while deploying v0.7.0 for the first time. Configure the SHOPLINE plan, Partner Token, and subscription webhooks first. Turn it on only after those pieces are ready. This avoids accidentally locking every existing merchant out before SHOPLINE subscription data can be read.

## Architecture

```text
SHOPLINE Partner Center
  ├─ Appointment Lite Pro ($5.99/month)
  └─ 7-day SHOPLINE-managed trial
             │
             ├──────── Partner API ────────┐
             │                             │
             └──────── Webhooks ───────────┤
                                           ▼
                               Appointment Lite server
                                ├─ subscription sync
                                ├─ checkout creation
                                ├─ signed webhook handling
                                ├─ MongoDB state cache
                                └─ access enforcement
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
                  Merchant Admin                       Storefront booking
                  active => full app                   active => bookable
                  inactive => billing gate             inactive => unavailable
```

The Partner Token is server-only. It must never be sent to the admin browser, Theme App Extension, public booking routes, or client logs.

## Environment variables

Add these Railway variables:

```env
# Keep false during the first v0.7.0 deploy.
SHOPLINE_SUBSCRIPTION_ENABLED=false

# Server-only token generated in SHOPLINE Partner Center.
SHOPLINE_PARTNER_TOKEN=YOUR_PARTNER_TOKEN

# Partner subscription API described by the supplied SHOPLINE guide.
SHOPLINE_PARTNER_API_VERSION=v20220901

# Must exactly match the actual SPU key configured in SHOPLINE.
SHOPLINE_SUBSCRIPTION_SPU_KEY=appointment_lite_pro
SHOPLINE_SUBSCRIPTION_PLAN_NAME=Appointment Lite Pro
SHOPLINE_SUBSCRIPTION_PRICE_USD=5.99

# Display/config metadata only. Trial eligibility and trial lifecycle stay in SHOPLINE.
SHOPLINE_SUBSCRIPTION_TRIAL_DAYS=7

# SHOPLINE application plans have a one-day grace period.
SHOPLINE_SUBSCRIPTION_GRACE_HOURS=24

# Refresh cached status at most every two minutes during normal admin use.
SHOPLINE_SUBSCRIPTION_SYNC_MAX_AGE_SECONDS=120
SHOPLINE_SUBSCRIPTION_TIMEOUT_MS=15000
```

If the actual SHOPLINE SPU key is not `appointment_lite_pro`, do **not** rename code. Set `SHOPLINE_SUBSCRIPTION_SPU_KEY` to the real Partner Center value.

## SHOPLINE Partner Center setup

Configure the paid application plan before enabling the runtime gate:

1. Create at least one feature point required by SHOPLINE application plans.
2. Create the paid plan and record its real SPU key.
3. Set the monthly USD price to `5.99`.
4. Add the plan to the global subscription group.
5. Configure the free-trial period to `7` days in SHOPLINE.
6. Generate a Partner Token and store it only in Railway.
7. Subscribe the app to the three subscription webhook events described below.

Do not create a local Free plan or local seven-day timer for Appointment Lite.

## Subscription webhooks

Use the existing signed SHOPLINE webhook endpoint:

```text
https://YOUR_APPOINTMENT_LITE_DOMAIN/webhooks/shopline
```

Subscribe to:

```text
appsubscription/create
appsubscription/expiration
appsubscription/paid
```

The implementation reuses Appointment Lite's existing raw-body HMAC verification and webhook idempotency receipt model. Invalid signatures are rejected, duplicate webhook IDs are not processed twice, and subscription events are isolated from booking/order webhook logic.

### appsubscription/create

Used when a subscription becomes active. Appointment Lite caches:

- `subId`
- `spuKey`
- active status
- trial/paid type
- trial flag
- auto-renew flag
- start/end timestamps

### appsubscription/expiration

Used when a subscription expires or is cancelled. Appointment Lite records the event, then immediately attempts a Partner API refresh because the Partner subscription list is the final authority. This is important for renewal/upgrade edge cases where an old subscription expires while another record becomes active.

### appsubscription/paid

Records the final checkout/payment result and associates `bizOrderNo` with the local checkout attempt. A successful payment triggers an immediate Partner API subscription refresh.

## Partner API integration

The server integrates the supplied SHOPLINE application-subscription endpoints:

```text
GET  /app_subscribe/productList.json
POST /app_subscribe/create_pay.json
GET  /app_subscribe/charges/status.json
GET  /app_subscribe/list.json
```

Requests use the server-only header:

```text
X-Shopline-Access-Token: <SHOPLINE_PARTNER_TOKEN>
```

### Checkout creation

Appointment Lite creates a unique `out_trade_no`, stores a local checkout attempt, and calls `create_pay.json` with:

```json
{
  "application_charge": {
    "count": "1",
    "out_trade_no": "al_<shop>_<time>_<random>",
    "return_url": "https://YOUR_DOMAIN/subscription/return?trade=...",
    "spu_key": "appointment_lite_pro",
    "app_key": "<SHOPLINE_APP_KEY>",
    "currency": "USD",
    "handle": "<shop-handle>"
  }
}
```

No `trial_days` value is sent. The seven-day trial remains a SHOPLINE-side plan setting.

Because Appointment Lite currently has only one monthly SKU, the implementation does not hard-code a `sku_id`. SHOPLINE can resolve the available billing option from the SPU. This keeps the application from depending on a Partner Center-generated SKU identifier. If additional billing cycles are added later, v0.7.0 should be extended to explicitly select a SKU.

### Checkout return

SHOPLINE returns the merchant to:

```text
/subscription/return?trade=<out_trade_no>
```

The server:

1. reads the payment status when the local checkout attempt exists;
2. refreshes the store's subscription via `list.json`;
3. redirects back to `/app?subscription=return`;
4. the admin bootstrap forces one more sync before rendering.

Webhook + return sync + normal periodic sync provide three layers of recovery from delayed or missed events.

## Local data model

`Shop.subscription` stores only a cache of SHOPLINE state:

```text
spuKey
subId
status
  none | pending | active | expired | unactive | cancelled | locked

type
  trial | paid | preorder

isTrial
autoRecurring
startedAt
expiresAt
everActivatedAt
expirationType
lastSyncedAt
lastWebhookAt
lastSource
lastPaymentStatus
lastPaymentAt
lastPaymentTradeNo
```

A separate `SubscriptionCheckout` collection stores local checkout traceability:

```text
shopId
outTradeNo
spuKey
status
checkoutUrl
subId
paymentStatusCode
completedAt
lastError
```

The checkout record does not grant access. Access comes from the SHOPLINE subscription state.

## Access policy

When subscription integration is enabled:

- `active` => access allowed;
- `expired` + still within configured 24-hour grace window => access allowed;
- `none`, `pending`, `unactive`, `cancelled`, or `locked` => access blocked;
- expired beyond grace => access blocked.

The exact subscription end time returned by SHOPLINE is used for display and grace-period evaluation. Appointment Lite does not calculate a trial start date from install time.

## Merchant admin behavior

The admin bootstrap always leaves subscription endpoints accessible so an inactive merchant can recover.

When the subscription is inactive, the merchant sees the Appointment Lite Pro billing gate instead of the rest of the app:

- `$5.99 USD / month`
- `7-day free trial`
- `Continue with SHOPLINE`
- `Refresh subscription`

The UI explicitly states that trial eligibility, billing, and renewal are managed by SHOPLINE. This avoids falsely promising another seven-day trial to a merchant who already used one.

When active, **Plan & billing** shows the SHOPLINE-backed state, including trial/paid status, access, end date, auto-renew state, and last sync time.

## Storefront behavior

An inactive subscription prevents new appointment use in both entry paths:

- product/theme public service lookup returns the normal unavailable response;
- server-side booking-context resolution also rejects new booking creation.

This gives a second server-side guard even if a stale storefront client still tries to submit a booking.

Existing customer management links are not deliberately destroyed when a plan becomes inactive. Existing booking data is retained so a merchant can resume service without losing configuration or history after reactivation.

## Admin APIs added in v0.7.0

```text
GET  /api/admin/subscription
POST /api/admin/subscription/sync
POST /api/admin/subscription/checkout
GET  /subscription/return
```

All Partner API calls happen on the server.

## Safe production rollout

### Phase 1 — deploy code without gating

```env
SHOPLINE_SUBSCRIPTION_ENABLED=false
```

Deploy v0.7.0 and verify `/health` reports version `0.7.0`.

### Phase 2 — configure billing infrastructure

- set Partner Token in Railway;
- confirm the real SPU key;
- configure `$5.99/month` and `7-day trial` in SHOPLINE;
- configure the three webhook topics on `/webhooks/shopline`.

### Phase 3 — validate with a test/dev shop

Before enabling the gate globally, validate:

1. `POST /api/admin/subscription/sync` can read the shop subscription;
2. an unsubscribed test shop can open SHOPLINE checkout;
3. eligible trial begins in SHOPLINE, not locally;
4. return flow comes back to Appointment Lite;
5. the app displays `trial` + the correct SHOPLINE end date;
6. `appsubscription/paid` is accepted with HTTP 200;
7. `appsubscription/create` is accepted with HTTP 200;
8. a test expiration/cancellation state is reflected after sync.

### Phase 4 — enable enforcement

```env
SHOPLINE_SUBSCRIPTION_ENABLED=true
```

Redeploy Railway. From this point, Appointment Lite admin functionality and new public bookings require a valid SHOPLINE subscription (or the configured grace window).

## Validation in this release

The v0.7.0 release suite covers:

- seconds/milliseconds SHOPLINE timestamp normalization;
- choosing the current subscription instead of a preorder record;
- active/inactive/grace access rules;
- checkout body construction with no local trial setting;
- server-only Partner Token configuration;
- subscription route wiring;
- signed subscription webhook topic wiring;
- Pro `$5.99` + seven-day trial merchant UI.

Run before deployment:

```bash
npm ci
npm run check
npm test
```

