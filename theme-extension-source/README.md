# Theme Extension source (not CLI-initialized)

This directory intentionally contains source files only. It is **not** registered with SHOPLINE and does not include `.shopline-cli.yml`.

After signing in to SHOPLINE CLI:

1. Run `sl extension create --name theme-app-extension` from the project root.
2. Choose the Theme App Extension type and the correct SHOPLINE app.
3. Copy `blocks/`, `public/`, and `i18n/` from this directory into the CLI-created `theme-app-extension/` directory.
4. Set the App Block's **API base URL** to the Railway public URL and **Shop handle** to the store handle shown in Appointment Lite admin.
5. Run `cd theme-app-extension && sl extension push`.

Do not copy a `.shopline-cli.yml` from another app; the CLI must generate it for the selected app.
