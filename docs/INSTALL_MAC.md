# Appointment Lite v0.3.2 Product Catalog Sync

Use `docs/INSTALL_MAC_COMMAND.txt` or the command supplied next to the release ZIP.

This release adds an explicit **Sync SHOPLINE products** action to the product picker and improves catalog freshness:

- reloads products from SHOPLINE without closing the service editor;
- bypasses the in-page cache on manual sync;
- includes published and draft products while excluding archived products;
- requests newest products first;
- follows SHOPLINE `page_info` pagination so larger catalogs are not limited to the first page;
- shows sync progress, synced count, success, and failure feedback.

The release command validates the ZIP, syncs Git safely, creates a backup tag, overlays the source while preserving `.env` and the local Theme App Extension binding, installs dependencies, runs all tests and JavaScript checks, commits/pushes Git, deploys Railway with `railway up`, and pushes the SHOPLINE Theme App Extension.

To validate locally without deployment:

```bash
DEPLOY_RAILWAY=0 PUSH_THEME=0 bash docs/INSTALL_MAC_COMMAND.txt
```

The release ZIP intentionally excludes `node_modules/`, `.git/`, `.env`, `dist/`, and `theme-app-extension/`.
