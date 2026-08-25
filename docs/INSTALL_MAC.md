# Appointment Lite v0.3.0 Scheduling Operations

Use `docs/INSTALL_MAC_COMMAND.txt` or the command supplied next to the release ZIP.

The release command is designed for the existing local Appointment Lite Git repository. It:

- validates the v0.3.0 ZIP before touching the project;
- fetches the active Git branch first and fast-forwards only when safe;
- stops before overlay if local/remote histories have diverged;
- creates an upgrade backup tag;
- preserves `.env`, `.git`, `node_modules`, `dist`, and the locally bound `theme-app-extension/`;
- overlays the v0.3.0 source;
- runs `npm ci`, the full test suite, and JavaScript syntax checks;
- synchronizes reusable Theme App Extension source into the local CLI-created extension;
- commits and pushes v0.3.0;
- deploys with `railway up` (no deprecated `-y` argument);
- pushes the SHOPLINE Theme App Extension with `sl extension push`.

v0.3.0 includes a startup index migration. Existing product rules are backfilled as product services; existing confirmed bookings receive `slotPosition: 0`; the old single-booking slot index is replaced by the capacity-position index. Existing data is retained.

Standalone in-store, onsite, consultation, class/course, and other services do not need the Theme App Block. The extension remains required for SHOPLINE product appointments.

To validate locally without deployment:

```bash
DEPLOY_RAILWAY=0 PUSH_THEME=0 bash docs/INSTALL_MAC_COMMAND.txt
```

The release ZIP intentionally excludes `node_modules/`, `.git/`, `.env`, `dist/`, and `theme-app-extension/`.
