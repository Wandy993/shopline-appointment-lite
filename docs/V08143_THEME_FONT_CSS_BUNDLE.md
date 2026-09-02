# Appointment Lite v0.8.1.4.3 - Theme Font CSS Bundle

## Why this release exists

SHOPLINE Theme App Extension upload validation rejects standalone font files in the extension `public` directory. The preceding experiments with `.woff2` and `.ttf` therefore failed at `sl extension push` even though the application tests passed.

The generic SHOPLINE theme `public` documentation describes fonts as theme assets, but Theme App Extension upload validation is stricter. Appointment Lite now treats the CLI-observed extension whitelist as the release contract rather than assuming that full-theme asset support also applies to Theme App Extensions.

## Delivery model

- Hosted booking, manage pages, Email Studio and transactional email continue to use the app-owned self-hosted font routes.
- Theme App Block, Staff Directory, booking modal and App Embed load `public/appointment-lite-fonts.css`.
- `scripts/sync-theme-fonts.mjs` reads the pinned Jost/Poppins WOFF2 packages locally and embeds their bytes as `data:font/woff2;base64,...` inside that CSS file.
- No `.woff2`, `.woff`, `.ttf`, or `.otf` file is placed in the Theme App Extension.
- The Theme Extension `public` folder is release-gated to `.css`, `.js`, `.jpg`, `.png`, and `.svg` only.
- The generated font CSS is capped at 1 MB and the complete Theme Extension is capped at 10 MB before deployment.

## Typography

- Customer-facing primary headings: Jost 600.
- Customer-facing body/control text: Poppins 400/500/600/700.
- Jost and Poppins do not contain CJK glyphs. Chinese characters therefore use the browser's CJK sans-serif fallback while Latin letters/numbers use the requested families.

## Release safety

Both `npm test` and `npm run check` regenerate the source-side font CSS before validation. The one-click deployment also generates the Theme Extension copy, removes font binaries left by prior failed releases, validates the extension asset whitelist, and only then allows Git/Railway/SHOPLINE deployment.
