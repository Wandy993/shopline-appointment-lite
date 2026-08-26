# Appointment Lite v0.6.0 Google Calendar Foundation

Use the v0.6.0 release ZIP together with its one-click Mac release command. The command backs up interrupted local work, restores the Git baseline, overlays the release, installs locked dependencies, runs the full test suite and JavaScript checks, commits/pushes Git, and queues the Railway deployment.

This release does **not** modify the storefront Theme App Extension, so the command intentionally skips `sl extension push`.

After deployment, configure the four Google Calendar variables in Railway and redeploy/restart the app if those variables were not already present. See [GOOGLE_CALENDAR.md](GOOGLE_CALENDAR.md).
