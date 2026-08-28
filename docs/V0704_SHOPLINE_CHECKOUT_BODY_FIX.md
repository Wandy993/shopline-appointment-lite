# v0.7.0.4 — SHOPLINE Checkout Body Fix

## Problem

The SHOPLINE Partner API `POST /v20220901/app_subscribe/create_pay.json` rejected Appointment Lite checkout creation with HTTP 400:

`The required property 'app_key' is missing from the object; The required property 'handle' is missing from the object`

The previous implementation placed `app_key`, `currency`, and `handle` inside `application_charge`.

## Root cause

SHOPLINE's subscription configuration document defines `application_charge` as the nested object for `count`, `out_trade_no`, `return_url`, `sku_id`, `spu_key`, and optional `sub_id`. `app_key`, `currency`, `handle`, and optional `second_channel_id` are top-level request body fields.

## Fix

Checkout creation now sends:

```json
{
  "app_key": "<SHOPLINE_APP_KEY>",
  "currency": "USD",
  "handle": "<shop-handle>",
  "application_charge": {
    "count": "1",
    "out_trade_no": "<unique-trade-no>",
    "return_url": "<Appointment Lite return URL>",
    "spu_key": "appointment_lite_pro"
  }
}
```

The seven-day trial remains entirely managed by SHOPLINE. Appointment Lite still sends no local `trial_days` field.

## Scope

This hotfix changes only SHOPLINE subscription checkout request construction and its regression test. Subscription sync, archive mode, renewal recovery, webhooks, booking data, and Theme Extension behavior remain unchanged.
