# Appointment Lite v0.3.1 Service Model Refinement + UI Cleanup

Use `docs/INSTALL_MAC_COMMAND.txt` or the command supplied next to the release ZIP.

The release command is designed for the existing local Appointment Lite Git repository. It:

- validates the v0.3.1 ZIP before touching the project;
- fetches the active Git branch first and fast-forwards only when safe;
- stops before overlay if local/remote histories have diverged;
- creates an upgrade backup tag;
- preserves `.env`, `.git`, `node_modules`, `dist`, and the locally bound `theme-app-extension/`;
- overlays the v0.3.1 source;
- runs `npm ci`, the full test suite, and JavaScript syntax checks;
- synchronizes reusable Theme App Extension source into the local CLI-created extension;
- commits and pushes v0.3.1;
- deploys with `railway up` (no deprecated `-y` argument);
- pushes the SHOPLINE Theme App Extension with `sl extension push`.

v0.3.1 includes a compatibility migration. Existing product/standalone rules become product/direct booking sources, legacy service titles are preserved, old product service types become general appointments, and the product uniqueness index is updated. Existing rules and bookings are retained.

Standalone in-store, onsite, consultation, class/course, and other services do not need the Theme App Block. The extension remains required for SHOPLINE product appointments.

To validate locally without deployment:

```bash
DEPLOY_RAILWAY=0 PUSH_THEME=0 bash docs/INSTALL_MAC_COMMAND.txt
```

The release ZIP intentionally excludes `node_modules/`, `.git/`, `.env`, `dist/`, and `theme-app-extension/`.
