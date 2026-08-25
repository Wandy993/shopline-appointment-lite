# Appointment Lite v0.2.4 Mac release overlay

Use `docs/INSTALL_MAC_COMMAND.txt` or the command supplied with the release ZIP.

The command is designed for the existing local Appointment Lite repository. It:

- verifies the exact v0.2.4 ZIP before touching local files;
- creates a Git backup commit/tag when possible;
- preserves `.env`, `.git`, `node_modules`, and the locally bound `theme-app-extension/` directory;
- overlays only distributable source files;
- runs `npm ci`, the complete test suite, and syntax checks;
- synchronizes `theme-extension-source/` into the existing CLI-created Theme App Extension;
- commits and pushes the release to the current Git branch when `origin` is available;
- deploys the backend with `railway up -y` by default;
- pushes the Theme App Extension with `sl extension push` by default;
- leaves the Terminal open on normal completion and prints explicit failures before exiting.

To skip a deployment step for a local-only validation run:

```bash
DEPLOY_RAILWAY=0 PUSH_THEME=0 bash ...
```

The release ZIP intentionally excludes `node_modules/`, `.git/`, `.env`, `dist/`, and `theme-app-extension/`. The latter contains local SHOPLINE CLI binding metadata and must remain on the developer machine. The reusable extension source lives in `theme-extension-source/`.
