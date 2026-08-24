# Theme Extension source (not CLI-initialized)

This directory intentionally contains source files only. It is **not** registered with SHOPLINE and does not include `.shopline-cli.yml`.

After signing in to SHOPLINE CLI:

1. Run `sl extension create --name theme-app-extension` from the project root.
2. Choose the Theme App Extension type and the correct SHOPLINE app.
3. Copy `blocks/`, `public/`, and `i18n/` from this directory into the CLI-created `theme-app-extension/` directory.
4. Run `cd theme-app-extension && sl extension push`.
5. Publish the new extension version, then add **Appointment Lite** to a product template. The block has no settings; adding/removing it is the on/off switch.

The production API URL is part of the extension source, while SHOPLINE's `shop.id` and `product.id` identify the current storefront context automatically. To troubleshoot, open the preview's browser console and filter for `[Appointment Lite]`.

Do not copy a `.shopline-cli.yml` from another app; the CLI must generate it for the selected app.
