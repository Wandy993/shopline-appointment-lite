# Appointment Lite v0.3.4 Service Editor UX + Booking Actions

Download `appointment-lite-v0.3.4-service-editor-ux-booking-actions.zip` and the one-click command to `~/Downloads`, then run from the existing project root:

```bash
bash "$HOME/Downloads/appointment-lite-v0.3.4-mac-one-click-command.txt"
```

The command verifies the release, safely syncs Git, creates a backup tag, overlays v0.3.4, runs `npm ci`, the full test suite and JavaScript checks, commits and pushes Git, queues Railway with `railway up --detach`, then immediately syncs and pushes the SHOPLINE Theme App Extension. It does not wait for Railway build/deploy completion before `sl extension push`.
