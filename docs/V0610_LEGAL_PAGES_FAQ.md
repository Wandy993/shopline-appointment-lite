# Appointment Lite v0.6.10 — Legal Pages & FAQ

v0.6.10 adds public, bilingual legal/help pages that can be submitted directly to the SHOPLINE App Store without requiring a merchant session, `shop` parameter, OAuth, or App Bridge.

## Public URLs

Production domain:

- Chinese Privacy Policy: `https://appointment.toolkit.fans/zh-cn/privacy`
- English Privacy Policy: `https://appointment.toolkit.fans/en/privacy`
- Chinese FAQ: `https://appointment.toolkit.fans/zh-cn/faq`
- English FAQ: `https://appointment.toolkit.fans/en/faq`

Convenience routes `/privacy` and `/faq` redirect to Chinese when the browser language starts with `zh`, otherwise English.

## Privacy coverage

Both privacy pages cover the current Appointment Lite data flow, including:

- SHOPLINE store, product, order, customer, staff, and location information
- Appointment data and lifecycle history
- Transactional booking email use
- Business Google Calendar OAuth and event synchronization
- Service providers and data sharing categories
- Security, retention, uninstallation, privacy rights, merchant responsibilities, international processing, and policy updates

The pages never require merchant authentication.

## FAQ

Both languages ship the same complete 45-question FAQ grouped into:

1. Getting started
2. Booking flows and orders
3. Scheduling, staff, and locations
4. Storefront booking experience
5. Notifications and calendars
6. Booking records and management
7. Privacy, uninstall, and support

FAQ pages use native `<details>` accordions plus a small first-party search script. No third-party frontend dependency is loaded.

## Legal contact configuration

Optional Railway environment variables:

```env
LEGAL_OPERATOR_NAME=Appointment Lite
LEGAL_SUPPORT_EMAIL=
```

If `LEGAL_SUPPORT_EMAIL` is configured, the public policies show the direct support email as a `mailto:` link. If it is empty, the page tells users to use the official Appointment Lite support contact in the SHOPLINE App Store instead of displaying a fake or placeholder address.

Set the final operator name and support email before App Store submission if a direct contact address is required by your listing/review process.
