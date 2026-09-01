# Theme Extension source (not CLI-initialized)

This directory intentionally contains source files only. It is **not** registered with SHOPLINE and does not include `.shopline-cli.yml`.

After signing in to SHOPLINE CLI:

1. Run `sl extension create --name theme-app-extension` from the project root.
2. Choose the Theme App Extension type and the correct SHOPLINE app.
3. Copy `blocks/`, `public/`, and `i18n/` from this directory into the CLI-created `theme-app-extension/` directory.
4. Run `cd theme-app-extension && sl extension push`.
5. Publish the extension version. Use **Appointment Lite** on product templates, **Appointment Lite · Booking** on regular pages for standalone services, or **Appointment Lite · Staff Directory** on regular pages for public team profiles. Page blocks take the Appointment Lite Service ID as their setting.

The production API URL is part of the extension source, while SHOPLINE's `shop.id` and `product.id` identify the current storefront context automatically. To troubleshoot, open the preview's browser console and filter for `[Appointment Lite]`.

Do not copy a `.shopline-cli.yml` from another app; the CLI must generate it for the selected app.


## Standalone services

Standalone services remain hosted at `/book/:ruleId`, and v0.8.0 can also surface them on a regular SHOPLINE Page through the **Appointment Lite · Booking** block. The **Staff Directory** block lists only active, assigned staff with `publicProfile=true`; staff email and phone are never returned by the public directory API.


## v0.8.1 storefront placement

Appointment Lite now ships four storefront extension surfaces:

- `Appointment Lite` — product detail App Block. Service visibility is controlled from each service's **Storefront placement** settings.
- `Appointment Lite · Booking` — regular Page App Block using a Service ID.
- `Appointment Lite · Staff Directory` — regular Page App Block using a Service ID.
- `Appointment Lite Launcher` — App Embed Block (`target: body`) for a global floating launcher.

The App Embed is not automatically activated after installation. The merchant must enable it from the SHOPLINE theme editor **App embeds** area. Only services with **App Embed floating launcher** enabled are returned to the launcher.

Product detail placement is presentation-only. It must not be treated as the checkout product or purchase-trigger product.
