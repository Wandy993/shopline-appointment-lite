# Appointment Lite v0.5.1 Staff Notifications + Staff Operations

This release upgrades the v0.5.0 staff foundation with employee avatars, a custom storefront staff picker, opt-in staff email notifications, and a daily Staff Operations schedule.

Use the generated one-click command delivered with the release ZIP. The command verifies the exact ZIP, syncs Git safely, installs locked dependencies, runs the full test suite and JavaScript checks, commits/pushes the release, queues Railway with `railway up --detach`, and then immediately pushes the SHOPLINE Theme App Extension with `sl extension push`.

Custom staff images are compressed in the browser so the normal 100 KB JSON request limit remains sufficient; the release does not add object storage or new infrastructure.
