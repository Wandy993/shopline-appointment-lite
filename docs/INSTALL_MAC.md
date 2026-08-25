# Appointment Lite v0.5.0-hotfix.1 Service Save Fix

This hotfix fixes the Mongoose schema mismatch that prevented normal minute/hour and all-day services from being saved after v0.5.0.

Download the release ZIP and external Mac one-click command to `~/Downloads`, then run from the existing project root. The command validates Git state, creates a backup tag, overlays the hotfix, runs `npm ci`, the full test suite and JavaScript checks, pushes Git, queues Railway with `railway up --detach`, and immediately pushes the SHOPLINE Theme App Extension.
