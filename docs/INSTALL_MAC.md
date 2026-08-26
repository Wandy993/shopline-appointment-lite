# Appointment Lite v0.6.0.1 Appointment → Google Calendar Sync

Use the release ZIP together with the one-click Mac command delivered alongside it.

The command:

1. verifies the release ZIP;
2. preserves any interrupted local work;
3. syncs Git and creates a backup tag;
4. overlays the release while preserving `.env`, `.shopline-cli.yml`, and the generated Theme App Extension directory;
5. runs `npm ci`, the complete test suite, and JavaScript checks;
6. commits and pushes Git;
7. queues the Railway deployment.

v0.6.0.1 does not modify `theme-extension-source`, so `sl extension push` is intentionally skipped.

After Railway deploys, open **Calendar Sync**. Existing v0.6.0 staff connections can use **Sync now** to backfill upcoming appointments; new bookings sync automatically.
