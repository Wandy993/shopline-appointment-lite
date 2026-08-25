# Appointment Lite v0.5.0 Staff Management Foundation

Download `appointment-lite-v0.5.0-staff-management-foundation.zip` and the external one-click command to `~/Downloads`, then run from the existing project root:

```bash
cd /Users/SL/Documents/appointment-lite
bash "$HOME/Downloads/appointment-lite-v0.5.0-mac-one-click-command.txt"
```

The command checks Git before overlay, creates a backup tag, overlays v0.5.0 while preserving the locally bound Theme App Extension, runs `npm ci`, the full test suite, and JavaScript checks, syncs the portable Theme Extension source, commits and pushes Git, queues Railway with `railway up --detach`, and immediately runs `sl extension push` without waiting for Railway build completion.

v0.5.0 adds managed Staff records, weekly staff schedules and exceptions, service-to-staff assignments, automatic/customer/fixed assignment modes, cross-service conflict protection, multi-session same-staff allocation, merchant reassignment, and Staff filtering in Bookings. Existing services stay in `No staff required` mode after upgrade until the merchant opts them into managed staffing.
