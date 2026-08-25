# Appointment Lite v0.4.0 Booking Modes Foundation

Download `appointment-lite-v0.4.0-booking-modes-foundation.zip` and the one-click command to `~/Downloads`, then run from the existing project root:

```bash
bash "$HOME/Downloads/appointment-lite-v0.4.0-mac-one-click-command.txt"
```

The command verifies the release, safely syncs Git, creates a backup tag, overlays v0.4.0, runs `npm ci`, the full test suite and JavaScript checks, commits and pushes Git, queues Railway with `railway up --detach`, then immediately syncs and pushes the SHOPLINE Theme App Extension. It does not wait for Railway build/deploy completion before `sl extension push`.

v0.4.0 introduces the booking-mode foundation: minute/hour, all-day, and multiple-session booking modes. Existing services migrate to minute/hour automatically. Multi-day date ranges are intentionally deferred to v0.4.1.
