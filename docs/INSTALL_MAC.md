# Appointment Lite v0.2.8 Arctic Blue UI System Refresh

Use `docs/INSTALL_MAC_COMMAND.txt` or the command supplied with the release ZIP.

This release command is designed for the existing local Appointment Lite Git repository. It:

- verifies the exact v0.2.8 ZIP before touching local files;
- fetches the current Git remote **before** overlaying release files;
- fast-forwards automatically when the local branch is only behind the remote, and stops before changing files if the histories have diverged;
- creates a Git backup tag;
- preserves `.env`, `.git`, `node_modules`, and the locally bound `theme-app-extension/` directory;
- overlays only distributable source files;
- runs `npm ci`, the complete test suite, and syntax checks;
- synchronizes `theme-extension-source/` into the existing CLI-created Theme App Extension;
- commits and pushes v0.2.8;
- deploys the backend with `railway up`;
- pushes the Theme App Extension with `sl extension push`.

The Arctic Blue refresh changes the merchant admin visual system only. Existing booking, onboarding, Email Studio, API, and storefront behavior is preserved. Existing merchants' saved custom email accent colors are not overwritten; `#2F6FED` is the default for new/unconfigured email branding.

To validate locally without deployment:

```bash
DEPLOY_RAILWAY=0 PUSH_THEME=0 bash ...
```

The release ZIP intentionally excludes `node_modules/`, `.git/`, `.env`, `dist/`, and `theme-app-extension/`. The reusable extension source lives in `theme-extension-source/`.
