# Appointment Lite v0.5.2 Storefront Calendar Booking UX

This release redesigns the customer-facing Theme App Block and hosted booking page around a calendar-first booking experience while preserving the existing booking engine, staff scheduling, capacity, all-day bookings, and multiple-session bookings.

Use `docs/INSTALL_MAC_COMMAND.txt` or the separately delivered one-click command. The release command verifies Git state, overlays the clean ZIP, runs `npm ci`, the full `npm test`, and `npm run check`, syncs the locally bound SHOPLINE Theme App Extension, pushes Git, queues Railway with `railway up --detach`, and immediately runs `sl extension push`.
