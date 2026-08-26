# Appointment Lite v0.6.0.4 Storefront Calendar Button + Staff Avatar Library

Use the release ZIP together with the one-click Mac command delivered alongside it.

The command:

1. verifies the release ZIP;
2. preserves interrupted local work;
3. syncs Git and creates a backup tag;
4. overlays v0.6.0.4 while preserving `.env`, `.shopline-cli.yml`, and the generated Theme App Extension directory;
5. removes the obsolete plan-limit compatibility service from the existing checkout;
6. runs `npm ci`, the complete test suite, and JavaScript syntax checks;
7. syncs `theme-extension-source` into the generated `theme-app-extension`;
8. commits and pushes Git;
9. queues Railway deployment;
10. runs `sl extension push`.

This release changes the Theme App Extension because the storefront confirmation state now includes customer Add-to-Calendar actions.
