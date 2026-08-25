# Appointment Lite v0.3.3 Product Sync + Safe Delete

Download `appointment-lite-v0.3.3-product-sync-safe-delete.zip` and the one-click command to `~/Downloads`, then run from the existing project root:

```bash
cd /Users/SL/Documents/appointment-lite
bash "$HOME/Downloads/appointment-lite-v0.3.3-mac-one-click-command.txt"
```

The command verifies the ZIP, syncs Git safely, creates a backup tag, overlays v0.3.3, runs `npm ci`, all tests and JavaScript checks, commits and pushes Git, deploys Railway with `railway up`, syncs the local SHOPLINE Theme App Extension, and runs `sl extension push`.

v0.3.3 reconciles the SHOPLINE Admin REST and Admin GraphQL product catalogs so product/service items missing from one API source can still be selected. Deleting a service now preserves historical Booking records; deletion is blocked only while confirmed bookings still exist.
