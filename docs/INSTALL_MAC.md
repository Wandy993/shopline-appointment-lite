# Appointment Lite v0.5.3 Storefront Booking UX + Time Zones

This release keeps the calendar-first customer booking surface inside a compact viewport, removes date-switch layout flicker with cached/prefetched availability and in-place skeleton loading, and adds service/customer time-zone support.

Use `docs/INSTALL_MAC_COMMAND.txt` or the separately delivered one-click command. The release command verifies Git state, overlays the clean ZIP, runs `npm ci`, the full `npm test`, and `npm run check`, syncs the locally bound SHOPLINE Theme App Extension, pushes Git, queues Railway with `railway up --detach`, and immediately runs `sl extension push`.
