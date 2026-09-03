## v0.8.8 — Online Meeting Delivery Completion

- Persists Zoom / Google Meet / Microsoft Teams / custom meeting URLs as an immutable booking snapshot instead of losing them at Mongoose persistence time.
- Reveals the private meeting CTA only after a booking is confirmed, using the merchant-configured button label.
- Delivers the meeting action across product-page confirmation, hosted booking confirmation, manage-appointment, confirmation/change/reminder emails, customer Google Calendar links, ICS files, and merchant Business Google Calendar sync.
- Keeps meeting URLs out of public rule / availability payloads before confirmation and removes the CTA after cancellation.
- Adds regression coverage for persistence, public serialization, calendar details, reminder projections, and storefront delivery.
- Existing online bookings created before this fix can recover a missing meeting snapshot from the service rule the first time their private manage/calendar flow is opened, then persist it for later use.

## v0.8.7 — Storefront Booking State Polish

- Staff selector dialogs now shrink to the real team-list height instead of inheriting a viewport-sized blank shell.
- Google Calendar is a compact secondary success action across Theme App Block and hosted booking surfaces.
- Confirmed product-page bookings now use one exclusive state: the Book Service trigger is force-hidden while the appointment management card is present.
- Confirmed-state cards inherit the active Booking Theme tokens so Warm Luxe / Minimal Light / Soft Editorial remain visually consistent.

## v0.8.5 — Booking Theme System + Modal Layout Fix

- Adds a storefront **Booking theme** system with three coordinated templates: **Minimal Light**, **Warm Luxe** (recommended default), and **Soft Editorial**.
- Adds **Background intensity**, **Corner style**, **Primary action color** (follow template/custom), and **Unified booking appearance** controls in Storefront Setup.
- Applies the selected visual system across the product-page staff selector, calendar, time slots, customer details form, confirmation state, hosted booking page, Page blocks, Staff Directory blocks, and App Embed surfaces.
- Keeps existing custom button/accent colors available; they become the active primary colors when **Custom color** is selected.
- Fixes the staff editor modal height regression that could leave a large blank area below the sticky action bar after enabling the public Staff Directory profile.
- Public Staff Directory responses now include normalized storefront appearance settings so regular-page directory blocks can match the rest of the booking journey.

## v0.8.4 — Staff Editor Polish

- Product-page staff selector width is reduced from 940px to 820px so the avatar, supported services, and Select action stay readable without the oversized empty middle area.
- Staff editor optional markers now render as compact badges instead of faint trailing text.
- The misleading staff **Region** field is removed from merchant UI. Region was presentation-only and was never linked to SHOPLINE Locations or service delivery. Existing legacy values are ignored on customer surfaces and are cleared the next time the staff profile is saved.
- Staff editor now explains that delivery location belongs to the appointment service. SHOPLINE location, customer address, online, and custom location remain configured under **Service location** in each service.
- Public staff payloads no longer expose the legacy region field.

## v0.8.3 — Staff Service List Selector

- Product-page staff selection now follows a directory-style row layout: staff avatar/name/role on the left, merchant-entered supported services with green checks in the center, and a lightweight **Select** action on the right.
- Clicking **Select** keeps the existing staff-aware availability logic and opens the normal calendar booking flow with that team member preselected.
- Staff now have a dedicated **Supported services** public-profile field in admin. Merchants enter one display label per line; these labels are presentation-only and do not replace the service-to-staff assignment rules used for availability/conflict checks.
- The regular Page Staff Directory block uses the same list pattern for consistent storefront presentation.
- Public staff payloads continue to keep email/phone private and only expose customer-safe profile information.

## v0.8.2 — Staff Directory Redesign + Reliable Customer Typography

- Staff Directory uses a full-width profile list with avatar, role, region, expertise tags, biography and a compact booking action.
- Placeholder public values such as “Select state...” are filtered before storefront output; email and phone remain private.
- Customer headings use Jost and supporting text/controls use Poppins with explicit CJK fallbacks and host-theme-resistant overrides.
- Theme fonts remain embedded in a supported CSS asset; no standalone font binaries are uploaded.
- Historical tests no longer pin the active package version, so normal SemVer upgrades do not break unrelated regression coverage.


## v0.7.0.7 — SHOPLINE Subscription New Window

SHOPLINE subscription activation and renewal now open the official SHOPLINE package page in a separate browser tab/window, so merchants can keep Appointment Lite open and return to refresh/recover subscription access after completing the SHOPLINE flow.
# Appointment Lite

## v0.7.0.6 — SHOPLINE Package-Only Hard Lock

Appointment Lite now hard-locks every subscription activation/renewal entry to SHOPLINE's official app package page. The current admin client opens that page directly, and the legacy `/api/admin/subscription/checkout` endpoint is kept only for stale cached clients and also returns the same package URL without any Partner checkout request. Admin app assets are served with `no-store` so an older checkout client cannot stay cached after a release.

See [SHOPLINE Package-Only Hard Lock](docs/V0706_SHOPLINE_PACKAGE_ONLY_HARD_LOCK.md).

## v0.7.0.4 — SHOPLINE Checkout Body Fix

Fixes SHOPLINE `create_pay.json` checkout creation by sending `app_key`, `currency`, and `handle` at the request-body root while keeping `spu_key` and checkout order fields inside `application_charge`, matching SHOPLINE's documented request hierarchy.

See [SHOPLINE Checkout Body Fix](docs/V0704_SHOPLINE_CHECKOUT_BODY_FIX.md).

## v0.7.0.3 — Subscription Recovery Hardening

Appointment Lite now force-reconciles any stale inactive subscription with SHOPLINE whenever the admin starts or an archived page is resumed. Renewal recovery no longer waits for the normal subscription cache: signed subscription webhooks, admin bootstrap, manual refresh, browser focus/visibility restore, and BFCache resume all converge on the Partner API as the authority. When SHOPLINE reports valid access again, archive restrictions are removed immediately and the merchant sees a recovery confirmation.

This does not bypass SHOPLINE's own package gate when SHOPLINE redirects the merchant before the embedded app is loaded. See [Subscription Recovery Hardening](docs/V0703_SUBSCRIPTION_RECOVERY_HARDENING.md).

## v0.7.0 — SHOPLINE Subscription Integration

Appointment Lite now uses SHOPLINE application subscriptions for a single paid **Appointment Lite Pro** plan at **USD 5.99/month**. The **7-day free trial stays fully managed by SHOPLINE**; Appointment Lite does not run a second local trial clock. v0.7.0 adds Partner API subscription sync, SHOPLINE checkout creation, signed subscription webhooks, a merchant Plan & billing experience, server-side admin/storefront access control, and safe data retention when a subscription becomes inactive.

Roll out with `SHOPLINE_SUBSCRIPTION_ENABLED=false` first, configure the Partner Token + real SPU key + webhooks, validate on a test store, then enable enforcement.

See [SHOPLINE Subscription Integration](docs/V070_SHOPLINE_SUBSCRIPTION.md) and [v0.7.0 deployment](docs/V070_DEPLOYMENT.md).


## v0.6.16 — Ops Hub Observability Integration

Appointment Lite now supports optional Toolkit Ops Hub telemetry using a MongoDB outbox, timestamp/raw-JSON HMAC signing, lifecycle and active-store events, heartbeat, daily usage summaries, and deduplicated health events. Telemetry excludes customer PII and cannot block booking, webhook, email, or calendar workflows. See `docs/V0616_OPS_HUB_OBSERVABILITY.md`.


> v0.6.16 — Ops Hub Observability Integration

Appointment Lite v0.6.16 adds optional Toolkit Ops Hub lifecycle, usage, heartbeat and health telemetry through a privacy-safe MongoDB outbox that never blocks customer booking flows.

## v0.6.15 Booking Performance & Reliability

- Reuses hot public service/shop context for a few seconds and coalesces identical in-flight availability calculations.
- Adds compound MongoDB indexes for service/date capacity and staff/date availability reads.
- Adds timing headers and slow-availability logging so production latency can be diagnosed from real requests.
- Gives hosted booking and Theme App Block GET requests an 8-second timeout plus one retry for network, 429, and 5xx failures; booking POST requests remain single-attempt.
- Delays the availability loading overlay by 180ms to remove unnecessary spinner flashes on fast responses.
- Isolates SHOPLINE reconciliation failures per merchant and adds a bounded 15-minute recent-order recovery sweep for missed webhooks.
- Retries transient SHOPLINE reads once and retries Google Calendar background sync at 0s / 1.5s / 5s without blocking the appointment itself.

See [Booking Performance & Reliability](docs/V0615_BOOKING_PERFORMANCE_RELIABILITY.md).

> v0.6.14 — Service Editor Picker Polish

Appointment Lite v0.6.14 standardizes the New / Edit appointment service selection experience and fixes the paid-checkout configuration spacing.

## v0.6.14 Service Editor Picker Polish

- Replaces browser-native dropdown presentation throughout the service wizard with Appointment Lite custom pickers.
- Covers Checkout variant, Payment hold, Minimum notice, and Availability exception selectors.
- Replaces the Service time zone browser datalist with a searchable Appointment Lite picker while keeping direct IANA time-zone input.
- Adds automatic drop-up / drop-down positioning, visible-area height limits, keyboard navigation, selected checks, and disabled-state sync.
- Makes the SHOPLINE Location picker use the same viewport-aware positioning so it does not hide behind the modal footer or other controls.
- Reworks the Standalone · payment required SHOPLINE checkout explanation into a compact card with clear spacing before checkout settings.

See [Service Editor Picker Polish](docs/V0614_SERVICE_EDITOR_PICKER_POLISH.md).

> v0.6.13 — Google OAuth Verification Readiness

Appointment Lite v0.6.13 turns the production root domain into a public product homepage and completes the public legal surface needed for Google OAuth brand verification.

## v0.6.13 Google OAuth Verification Readiness

- Replaces the root runtime placeholder with a public English Appointment Lite homepage at `https://appointment.toolkit.fans/`.
- Adds a public Chinese homepage at `/zh-cn` and keeps language switching across public pages.
- Adds bilingual Terms of Service at `/en/terms` and `/zh-cn/terms`.
- Links Home, Privacy, Terms, and FAQ consistently from the public header and footer.
- Describes Google Calendar data use on the public homepage using the same owned-calendar model implemented by the app.
- Adds `robots.txt` and `sitemap.xml` for the public verification surface.
- Preserves SHOPLINE install behavior when the root URL carries `handle` or `appkey`.
- Keeps the production Google callback at `https://appointment.toolkit.fans/integrations/google/callback` and does not broaden Calendar scopes.

See [Google OAuth Verification Readiness](docs/V0613_GOOGLE_OAUTH_VERIFICATION_READINESS.md).

> v0.6.12 — Storefront CTA Layout Polish

Appointment Lite v0.6.12 makes the final booking action more compact on desktop and keeps mobile booking actions easy to tap.

## v0.6.12 Storefront CTA Layout Polish

- Changes the hosted/direct booking page **Confirm booking** action from full width to **Fit content + Right** by default on desktop.
- Applies the same compact action layout to the Theme App Block booking dialog and paid-booking **Continue to checkout** action.
- Forces the primary action back to full width on mobile for a safe touch target.
- Adds **Primary action width** and **Primary action alignment** controls to Storefront Setup.
- Lets merchants choose Fit content / Full width and Left / Center / Right desktop alignment.
- Updates the live storefront preview to mirror the chosen action layout.

See [Storefront CTA Layout Polish](docs/V0612_STOREFRONT_CTA_LAYOUT_POLISH.md).

> v0.6.11 — Email Template Polish

Appointment Lite v0.6.11 polishes transactional email branding and gives Google Calendar actions a clear Google identity across real emails and Email Studio preview.

## v0.6.11 Email Template Polish

- Rebuilds the email brand header with an email-safe presentation table so the logo and brand name stay vertically aligned in Gmail, Outlook, and other clients that do not reliably support flexbox.
- Adds a fixed 14px brand gap so the logo and merchant brand name no longer touch or drift together.
- Replaces the merchant-accent Google Calendar button with a neutral Google-style action using the official multicolor Google G asset hosted on `gstatic.com`.
- Keeps the merchant accent color for Appointment Lite actions such as **Manage appointment**, clearly separating first-party booking actions from the external Google Calendar action.
- Updates Email Studio live preview to show the same Google Calendar treatment on templates that include calendar actions.
- Keeps cancellation templates free of calendar actions and preserves existing notification routing and calendar-link behavior.

See [Email Template Polish](docs/V0611_EMAIL_TEMPLATE_POLISH.md).

> v0.6.10 — Legal Pages & FAQ

Appointment Lite v0.6.10 publishes App Store-ready Chinese and English Privacy Policy and FAQ pages as public routes that do not require SHOPLINE admin authentication.

## v0.6.10 Legal Pages & FAQ

- Adds `/zh-cn/privacy` and `/en/privacy` with privacy coverage for SHOPLINE store/product/order data, booking customers, staff, locations, transactional email, Business Google Calendar, retention, uninstallation, privacy rights, and data deletion requests.
- Adds `/zh-cn/faq` and `/en/faq` with the same complete 45-question help center.
- Adds FAQ keyword search and native accordion sections with no third-party frontend dependency.
- Adds `/privacy` and `/faq` language shortcuts: Chinese browser languages redirect to `zh-cn`; all other languages default to English.
- Keeps all four App Store URLs public and independent from merchant OAuth, App Bridge, `shop` query parameters, or admin sessions.
- Adds optional `LEGAL_OPERATOR_NAME` and `LEGAL_SUPPORT_EMAIL` environment settings. When no support email is configured, the legal page points users to the official SHOPLINE App Store support contact instead of rendering a fake email address.

Production URLs after Railway deploy:

- `https://appointment.toolkit.fans/zh-cn/privacy`
- `https://appointment.toolkit.fans/en/privacy`
- `https://appointment.toolkit.fans/zh-cn/faq`
- `https://appointment.toolkit.fans/en/faq`

See [Legal Pages & FAQ](docs/V0610_LEGAL_PAGES_FAQ.md).

> v0.6.9 — Storefront Customizer

Appointment Lite v0.6.9 adds merchant-controlled storefront styling so the booking entry and customer booking UI can match each SHOPLINE theme without changing service scheduling logic.

## v0.6.9 Storefront Customizer

- Adds a live **Storefront setup** editor for booking button text, background/text colors, width, alignment, and corner radius.
- Changes the default product-page booking entry to **Fit content** instead of forcing a full-width blue button.
- Adds booking-dialog accent and primary-button text colors, applied to selected dates/times and primary actions.
- Lets merchants show or hide optional service summary, customer time-zone selector, Phone field, Notes field, and footer guidance.
- Keeps Name and Email protected; required customer-address and staff-selection fields still follow each service rule and cannot be hidden by storefront styling.
- Shares the modal appearance and optional-field settings with hosted/direct booking pages.
- Publishes storefront settings in the public rule/service payload with revalidation instead of a persistent storefront rule cache, so saved design changes are visible after refresh.

See [Storefront customizer](docs/V069_STOREFRONT_CUSTOMIZER.md).

> v0.6.8 — Booking Record Action Menu

Appointment Lite v0.6.8 simplifies booking operations: the list now uses a five-column hierarchy, keeps **Appointment activity** visible, and moves secondary actions into a compact custom **Actions** menu.

## v0.6.8 Booking Record Action Menu

- Booking details group date, time, staff, location, and timezone in one scan-friendly column.
- Payment and appointment states remain centered and visually stable.
- Only Appointment activity and Actions stay visible in the operations area.
- The Actions menu contains SHOPLINE order access, edit, complete, no-show, cancel, and delete when relevant.
- Delete still requires the existing custom second confirmation.

> v0.6.7 — Admin Readability + Booking Table Cleanup

Appointment Lite v0.6.7 improves merchant-admin readability and rebuilds the booking-record table so operational information stays aligned, high-contrast, and easy to scan.

## v0.6.7 Admin Readability + Booking Table Cleanup

- Raises the main admin typography contrast from washed-out blue-gray to near-black neutrals while keeping semantic green/amber/red status colors intact.
- Strengthens secondary copy and small metadata weights so text stays crisp on desktop displays without flattening visual hierarchy.
- Removes the dedicated **SHOPLINE order number** column from Booking records; linked orders remain accessible through a compact **Open order** action.
- Rebuilds the Booking record grid as **Customer & service → Date & time → Assignment → Payment → Appointment → Actions**.
- Centers Payment and Appointment badges and their progress labels for consistent scanning across rows.
- Gives the actions column more width and keeps responsive/mobile row ordering stable after the order-number column is removed.
- Uses **Unassigned** for purchase-first lifecycle rows until a staff member is actually selected, avoiding duplicate “Not scheduled yet” labels.

See [Admin readability & booking table cleanup](docs/V067_ADMIN_READABILITY_BOOKING_TABLE.md).

> v0.6.6 — Booking Admin UX Polish

Appointment Lite v0.6.6 polishes the merchant-facing booking workflow on top of v0.6.5, with a cleaner purchase-first explanation, a native-looking Appointment Lite location picker, newest-record-first ordering, and safe record deletion.

## v0.6.6 Booking Admin UX Polish

- Replaces the oversized purchase-first scheduling explanation with a compact information card that matches the service editor hierarchy.
- Replaces the browser-native SHOPLINE location `<select>` with an Appointment Lite custom picker, including address context and a default-location badge.
- Reorders Booking record columns so **Date & time** and **Assignment** appear before **Payment** and **Appointment** status.
- Sorts order-backed records by the SHOPLINE order creation timestamp when available, falling back to the original Appointment Lite record creation timestamp instead of mutable `updatedAt`.
- Adds a destructive **Delete** action to booking records with Appointment Lite's custom confirmation dialog.
- Uses soft deletion for booking records so operational history is not physically removed from MongoDB; active appointments release capacity and Google Calendar mappings are cleaned up.
- Allows merchants to remove order-lifecycle rows while leaving the SHOPLINE order itself untouched and revoking remaining private scheduling access for that removed lifecycle record.

See [Booking admin UX polish](docs/V066_BOOKING_ADMIN_UX_POLISH.md).

## v0.6.5 Order Lifecycle + SHOPLINE Locations

- Shows purchase-first SHOPLINE orders in **Bookings** as soon as a matching order is observed, including unpaid orders before a scheduling link is available.
- Separates **Payment** and **Appointment** lifecycle states so merchants can distinguish unpaid, paid/awaiting scheduling, partially scheduled, and scheduled work.
- Keeps the SHOPLINE order ID/name on operational rows and links directly to the matching SHOPLINE order in Admin.
- Reconciles recent paid and unpaid SHOPLINE orders on demand and after reauthorization, in addition to webhook delivery.
- Adds read-only `read_location` authorization and reads locations from SHOPLINE's Locations API; inventory access is not requested.
- Adds four service-location modes: **SHOPLINE location**, **Customer address**, **Online**, and **Custom location**.
- Saves both the SHOPLINE location ID and an address snapshot so historical bookings retain the location used at booking time even if the merchant later edits the SHOPLINE location.
- Prefills the SHOPLINE order shipping address for purchase-first services that are delivered at the customer's address.
- Updates hosted booking and the Theme App Block to collect a customer service address only when the service requires it.

See [Order lifecycle & SHOPLINE locations](docs/ORDER_LIFECYCLE_LOCATIONS.md).

## v0.6.4 Order Sync & Availability Performance

- Adds required `read_orders` authorization for paid and post-purchase booking modes without requesting order write access.
- Uses `orders/paid` as the primary payment confirmation webhook and keeps transaction webhooks as a compatibility fallback.
- Reconciles recent paid orders after reauthorization and on demand from Bookings.
- Batches staff/reservation reads for storefront availability instead of querying per time slot.
- Shows linked SHOPLINE orders directly in Booking records.
- Adds a separate customer preference for post-purchase private scheduling-link email delivery.


All four commerce relationships are now active:

1. **Standalone · no payment** — choose a time and confirm directly.
2. **Standalone · payment required** — choose a time, hold capacity, pay through SHOPLINE checkout, then confirm.
3. **Product + appointment** — keep SHOPLINE purchase actions and expose an independent pre-purchase appointment action.
4. **Purchase first · schedule after** — buy the linked SHOPLINE product first; after payment, the buyer receives a private Appointment Lite scheduling link.

For purchase-first services, Appointment Lite subscribes to the same order/payment webhook surface used by paid bookings plus order cancellation. A paid matching order creates an order entitlement. **Each purchased unit grants one appointment**; quantity 2 grants two bookings through the same private link. The order customer is prefilled on the private scheduling page, and confirmed bookings snapshot the SHOPLINE order ID/name for operations and support.

The private link uses a high-entropy token whose SHA-256 hash is stored in MongoDB. It is never exposed through normal public payloads. Transient scheduling-email failures are retried by a lightweight background scheduler. Order cancellation revokes unused scheduling access. Cancelling a confirmed Appointment Lite booking restores that order's unused appointment quota unless the SHOPLINE order itself has been revoked.

The purchase-first service does **not** show a booking button before purchase. Merchants continue to use the normal SHOPLINE product page and checkout; the scheduling entry is delivered privately after payment. Existing confirmed appointments are not automatically cancelled when a SHOPLINE order is later cancelled, because that may require merchant-specific refund/service handling.

See [Post-purchase Appointment](docs/POST_PURCHASE_APPOINTMENTS.md) and [Paid Booking Flow](docs/PAID_BOOKING.md).

### Theme guidance

Appointment Lite does **not** remove SHOPLINE purchase buttons with JavaScript. Appointment-only products should use a dedicated product template without native purchase buttons. Product + appointment services keep normal SHOPLINE purchase actions. Purchase-first services use the normal product template and do not expose a pre-purchase booking action.

## v0.6.0.6 Email Design UI Polish

- Rebuilds customer and merchant notification switches as structured option cards with consistent checkbox alignment and separate title/description hierarchy.
- Shortens notification helper copy so Simplified Chinese no longer crowds or visually merges with option titles.
- Adds clear context under customer reply-to and merchant inbox fields.
- Groups reminder timing into a dedicated control that applies to both customer and merchant pre-appointment reminders.
- Gives the Email Studio editor more usable width and stacks the preview sooner on narrower admin layouts.
- Keeps the v0.6.0.5 notification behavior, reminder scheduler, calendar overflow, and delivery settings unchanged.

## v0.6.0.5 Storefront Calendar Button + Staff Avatar Library

- Redesigns the customer **Add to Google Calendar** action as an Appointment Lite soft-secondary control with the official multicolor Google G, a clearer visual hierarchy, and consistent hover behavior.
- Applies the same calendar-action treatment to the Theme App Block and hosted booking confirmation page.
- Replaces the previous eight portrait assets with nine user-supplied 1024px headshots, optimized to 640px WebP for sharp storefront/admin rendering without multi-megabyte downloads.
- Preserves all existing avatar preset IDs for stored staff profiles and adds one new `nova` preset for the ninth portrait.
- Keeps custom image upload and initials fallback unchanged.
- Expands the staff avatar picker to a clearer nine-portrait library and updates cache/version markers to `0.6.0.5`.
- Updates the Theme App Extension to `0.6.0.5`, so this release requires `sl extension push`.

## v0.6.0.3 Business Calendar UX Cleanup

- Keeps **Primary merchant inbox** and staff assignment emails independent from Google. Gmail, QQ, 163, Outlook, and normal enterprise addresses are treated the same.
- Makes **Business Google Calendar** the only merchant-facing Google connection: one store authorization receives every confirmed appointment.
- Removes personal staff Google authorization from the merchant UI. Staff and technicians do not need a SHOPLINE admin login or Google account; add their email in **Staff** to notify them.
- Removes customer Google guest invitations from live sync to avoid first-contact **Unknown sender** invitation warnings.
- Simplifies customer confirmation surfaces to one **Add to Google Calendar** action. The signed ICS endpoint remains only for backward compatibility and is no longer exposed as a browser download button.
- Replaces the generic Google tile with the standard multicolor Google **G** treatment and completes Chinese Calendar Sync translations.
- Removes OAuth scope, redirect URI, Railway, future-milestone, and other implementation details from merchant-facing Calendar Sync UI.
- Keeps runtime feature-tier limits and plan gating removed. Notification and calendar capabilities are built-in product behavior rather than paid feature flags.
- Updates the Theme App Extension to `0.6.0.3`, so this release requires `sl extension push`.

See [Google Calendar architecture](docs/GOOGLE_CALENDAR.md) and [Email notifications](docs/EMAIL.md).

## v0.6.0.1 Appointment → Google Calendar Sync

- Activates live Google event creation for new confirmed bookings assigned to staff with connected calendars.
- Keeps single-slot reschedules on the same Google event identity so customers receive an update instead of a cancellation/new-invite pair.
- Syncs merchant date/time/location edits, staff reassignment, and customer/merchant cancellation.
- Supports multi-session and all-day Google event projections.
- Adds deterministic event IDs plus private Appointment Lite extended properties for retry-safe reconciliation.
- Adds per-staff **Sync appointments** and **Send customer calendar invitations** controls. Customer invitations are enabled by default and use Google `sendUpdates=all`.
- Adds **Sync now** so staff connections created on v0.6.0 can backfill existing upcoming bookings immediately.
- Persists Google event mappings and sync health on bookings while keeping refresh tokens encrypted and excluded from normal queries.
- Keeps Google busy-time blocking out of this milestone; Appointment Lite remains the source of truth for availability and capacity.
- Does **not** change `theme-extension-source`; no SHOPLINE Theme Extension push is required.

See [Google Calendar sync](docs/GOOGLE_CALENDAR.md).

## v0.6.0 Google Calendar Foundation

- Adds a dedicated **Calendar Sync** workspace in merchant Admin.
- Lets each active managed staff member connect a separate Google account through OAuth 2.0 and choose one calendar they own.
- Requests offline access and stores only an AES-256-GCM encrypted Google refresh token in MongoDB; the token field is excluded from normal model queries.
- Adds reconnect, calendar-change, health/error, and disconnect flows. Disconnect performs a best-effort Google token revocation before deleting the local connection.
- Restricts the first release to owned calendars and the least-privilege `calendar.events.owned` plus `calendar.calendarlist.readonly` scopes.
- Adds a unique per-store/per-staff Google connection model and database index.
- Does **not** create/update Google events or block Google busy time yet. Appointment-to-Google event sync and external-busy conflict checking are the next synchronization layer.
- Does **not** change `theme-extension-source`; no SHOPLINE Theme Extension push is required for this Foundation release.

See [Google Calendar setup and security](docs/GOOGLE_CALENDAR.md).

## v0.5.4-hotfix.3 Confirmation Modal Auto Height

- Forces the successful product-page booking dialog to switch from the full booking flex layout to a compact content-sized block layout.
- Adds the compact confirmation class synchronously when the booking succeeds, avoiding browser `:has()` support or MutationObserver timing as a requirement.
- Aligns admin, hosted booking, staff-avatar, health, and Theme Extension cache/version markers to `0.5.4-hotfix.3`.
- Adds regression coverage for release-version consistency so stale `.2` asset references fail tests before deployment.

## v0.5.4-hotfix.2 Avatar + Confirmation + Typography Hotfix

- Replaces the previous blurry staff portrait presets with a clearer generated set while preserving existing preset IDs.
- Shrinks the Theme App Extension confirmation dialog to its actual content height by releasing the booking form flex height.
- Uses one system sans-serif typography stack for all storefront booking copy, fields, buttons, staff pickers, time slots and confirmation text.
- Keeps custom staff photo upload and initials fallback unchanged.

## v0.5.4-hotfix.1 Staff Avatar + Admin i18n Cleanup

- Storefront preset avatars are embedded in the public staff payload so existing staff profiles render without cross-origin asset failures.
- Built-in staff portraits are upgraded to larger WebP assets and cache-busted in Admin.
- Admin locale switching can reverse dynamically captured Chinese text back to English and rerenders staff schedule surfaces.

## v0.5.4 Staff Schedule Views + Storefront Modal Polish

- Staff Operations now switches between a compact appointment list and a daily calendar/timeline view, using the same selected date. The timeline shows staff rows, time-axis booking blocks, all-day assignments, and direct navigation to the booking record.
- The eight built-in staff presets are now bundled AI-generated portrait-style headshots rather than illustrated avatars. Existing preset IDs remain compatible, while merchant uploads and initials continue to work unchanged.
- Storefront time-zone menus float above the booking layout instead of being clipped by the calendar/form container. On mobile, staff and time-zone pickers become fixed bottom sheets so they stay usable above the CTA and browser chrome.
- Selected time slots force high-contrast white text on the Arctic Blue selected state, including nested slot labels that may otherwise inherit theme colors.
- The Theme App Block booking-confirmed state now collapses to a compact confirmation card with structured date/time, staff, location, and service-time-zone details instead of retaining the full booking-dialog height.
- Mobile Theme booking becomes a consistent viewport-filling flow for active booking and a compact modal for confirmation, with tightened calendar/form spacing and fixed-overlay pickers.

## v0.5.3 Storefront Booking UX + Time Zones

- Desktop booking dialogs stay within the viewport. Calendar density, fields, and spacing are compacted, while long slot lists scroll inside the slot area instead of growing the whole modal.
- Date changes keep the slot panel height stable. Cached or prefetched availability renders immediately; uncached dates use an in-place skeleton overlay instead of clearing the slot panel and causing layout flicker.
- Each service can define an IANA **service time zone**. Leaving the field blank inherits the SHOPLINE store time zone, so existing services keep their current behavior.
- Storefront customers default to their browser time zone and can choose another display time zone. The calendar remains the service calendar; slot labels are converted for display and include the converted date if the time crosses a date boundary.
- Booking submissions, capacity, minimum notice, exceptions, and stored appointment times remain canonical in the service time zone. All-day bookings remain date-based in the service time zone.
- Staff schedules are still shared store-level schedules. If one staff member is used across multiple services, those services should use the same service time zone for predictable conflict semantics.

## v0.5.2 Storefront Calendar Booking UX

- Replaces the customer-facing native date field with an Appointment Lite monthly calendar on the Theme App Block and hosted booking page.
- Desktop uses a balanced two-column experience: calendar/time-zone context on the left; staff, time slots, customer details, and confirmation on the right.
- Mobile automatically collapses to a single-column flow while keeping the confirmation action easy to reach.
- Calendar dates respect the service weekly schedule, date range, special closed/open dates, and booking window before a customer requests live capacity/staff availability.
- Minute/hour bookings show available time pills; all-day bookings show date-level availability; multiple-session bookings mark dates that already contain selected sessions.
- Staff selection continues to use the custom avatar picker, and changing staff immediately refreshes the selected date's availability.
- The booking API, capacity rules, staff conflict checks, booking notifications, and appointment management behavior are unchanged.

## v0.5.1-hotfix.1 Service Editor hidden-field fix

- Prevents hidden `sessionsRequired` / all-day-only controls from blocking Save with browser `not focusable` validation errors.
- Disables inactive Booking Mode controls and re-enables only the controls for the selected mode.
- Automatically restores a valid default session count when switching an existing single-slot service to Multiple Sessions.
- Keeps the wizard on application-level step validation via `novalidate`, so hidden steps cannot block submit before Appointment Lite can show a useful error.

## v0.5.1 Staff Notifications + Staff Operations

- Staff profiles now support eight built-in illustrated avatar presets, initials, or a merchant-uploaded PNG/JPG/WebP image. Custom images are center-cropped and compressed in the browser before the lightweight data URI is stored, so no separate object-storage service is required.
- Customer-facing **Customer chooses** staffing no longer uses the browser-native select. The Theme App Block and hosted booking page use the same Appointment Lite listbox with staff avatar, name, selected state, and automatic availability refresh.
- Staff email notifications are explicit opt-in per employee. When enabled and an email is present, Appointment Lite sends assignment, reschedule/update, reassignment, and cancellation notices without blocking the booking transaction if email delivery fails. Existing employees are not silently opted in.
- The Staff workspace adds **Team schedule**, a date-based operations view showing each active employee's confirmed assignments and unassigned appointments, with direct navigation to the booking record.
- Avatar metadata exposed to storefronts contains only the public avatar/name/id fields; employee email and phone remain admin-only.

## v0.5.0-hotfix.1 Service Save Fix

- Fixes service creation/update for minute/hour and all-day modes by allowing the persisted single-occurrence value `sessionsRequired = 1`.
- Multi-session services still require 2–12 sessions through application validation.
- Normalizes existing non-multi services to `sessionsRequired = 1` during startup compatibility checks.
- Converts Mongoose `ValidationError` failures into actionable HTTP 422 responses instead of a generic 500 error.

## v0.5.0 Staff Management Foundation

Appointment Lite now treats staff as a first-class scheduling resource instead of a free-text label. The new **Staff** workspace lets a merchant create active/inactive team members, store contact details, define weekly working hours and one-off availability exceptions, and see which appointment services each staff member is assigned to.

Each appointment service can independently choose a staff assignment policy:

- **No staff required** — preserves the existing lightweight behavior and keeps legacy free-text staff compatible.
- **Any available staff** — Appointment Lite automatically assigns one eligible staff member who is available for the full appointment.
- **Customer chooses** — storefront/hosted booking UI asks the customer to choose from eligible staff, then filters availability for that member.
- **Fixed staff** — a service always uses one configured team member.

Staff scheduling is booking-mode aware. Minute/hour appointments check the full service duration **plus buffer** against the staff schedule. All-day appointments reserve the staff member for the service date. Multiple-session bookings choose one staff member who is available for every selected occurrence, so a course pack does not silently change instructors between sessions. A five-minute staff-reservation bucket ledger prevents overlapping appointments across different services while still allowing the same instructor to serve a group-capacity occurrence of one class/service.

Bookings now preserve a denormalized staff snapshot, expose a Staff filter, and let merchants reassign a confirmed minute/hour booking only after conflict validation. Cancelling, completing, or marking no-show releases staff reservations. Staff members with confirmed bookings cannot be deactivated/deleted, and staff assigned to services must be removed from those services first, preventing a service from silently losing its staffing policy.

Existing stores are migrated safely: existing rules receive `staffAssignment.mode=none`; legacy free-text staff labels remain untouched until the merchant opts that service into managed staff.

## v0.4.0 Booking Modes Foundation

Appointment Lite now separates three independent questions:

- **Service type** — appointment, in-store, home/onsite, consultation, class/course, or other.
- **Booking source** — SHOPLINE product page, hosted booking page, or both.
- **Booking mode** — how the customer selects time.

Booking modes in v0.4.0:

- **Minute / hour** (`slot`) — one generated start time using duration + buffer. This is the existing appointment engine.
- **All day** (`all_day`) — the customer selects a date only. Duration, buffer, and hourly windows are removed from the customer flow; capacity is reserved per day.
- **Multiple sessions** (`multi_slot`) — the customer selects an exact number of generated sessions in one booking, designed for course packs and repeat services.

The same Theme App Block and hosted booking page render the correct experience from `bookingMode`; merchants do not install separate blocks for each mode. Multi-session capacity is protected for every selected occurrence through the `BookingReservation` collection, so a bundle cannot partially overbook one of its sessions. Existing bookings and services are migrated to `slot` automatically.

Multi-day date-range inventory is intentionally deferred to v0.4.1 because range inventory and conflict rules are materially different from date-level and time-slot capacity.

## v0.3.4 Service Editor UX + Booking Actions

- The service editor is now a fixed-height internal scroller: header, wizard progress, close button, and bottom actions stay visible while the step content scrolls.
- Service configuration sections have stronger spacing and grouping so service type, booking source, timing, weekly schedule, and exceptions no longer visually run together.
- Availability now explains the slot algorithm in the UI. A 60-minute service with a 15-minute buffer creates starts every 75 minutes; for 09:00–17:00 that means 09:00, 10:15, 11:30, 12:45, 14:00, and 15:15.
- Booking-list actions now use text for Activity and semantic colors for edit, complete, no-show, and cancel.

## v0.3.3 Product Sync Reliability + Safe Service Deletion

- Product sync now reads both the SHOPLINE Admin REST product list and the Admin GraphQL `products` connection using the same `read_products` authorization, then reconciles products by SHOPLINE product ID.
- This dual-source sync is specifically intended to cover product/service records that are visible in SHOPLINE Admin but are temporarily omitted by one product-list API surface.
- Archived products remain hidden from the picker; active and draft products remain selectable.
- The sync response records REST/GraphQL source counts and logs a reconciliation warning when the sources disagree, making product-catalog gaps diagnosable instead of silently showing a partial list.
- Service deletion now removes the appointment-service configuration while preserving cancelled/completed/no-show historical Booking records for reporting and audit.
- A service with confirmed bookings is protected from deletion until those bookings are cancelled, completed, or marked no-show.
- Theme-version tests now validate against `package.json` instead of hard-coding the previous release number, preventing version-only test failures on future releases.

## v0.3.2 Product Catalog Sync

- Adds a **Sync SHOPLINE products** action directly inside the product picker.
- A manual sync bypasses the in-page product cache and immediately reloads the catalog from SHOPLINE.
- Newly created products are requested newest-first.
- Draft products are shown and can be selected while archived products stay hidden.
- Product catalog requests use no-store responses and cursor pagination so the picker is not limited to the first page of products.
- The picker shows sync progress, result count, and clear success/failure feedback.

## v0.3.1 Service Model Refinement + UI Cleanup

v0.3.1 separates **what the merchant offers** from **where the customer starts booking**.

A service can now be an appointment, in-store visit, home/onsite service, consultation, class/course, or other service. Independently, its booking source can be:

- **Product page** — requires a linked SHOPLINE product and is discovered by the Theme App Block.
- **Booking page** — uses a direct hosted booking URL and does not require a product.
- **Both** — binds a SHOPLINE product and also exposes the shareable hosted booking URL.

This means a consultation, installation, measurement visit, or course can be represented by a SHOPLINE service product and still use the storefront App Block. The appointment service name is also independent from the linked product title, so a product named `Sofa A` can expose a service named `Free home measurement`.

The merchant UI is refined at the same time:

- service rows now emphasize service name, type, booking source, booking count, status, and actions instead of uneven metadata tiles;
- Bookings uses one consistent filter surface for search, service, status, date range, reset, and List/Calendar view;
- Email Studio uses an inbox-style live preview with a realistic subject/from header and structured appointment detail rows;
- actual customer emails use the same clearer structured appointment details.

Existing v0.3.0 rules are migrated automatically: product rules become `bookingSource=product`, standalone rules become `bookingSource=direct`, existing titles become `serviceTitle`, and legacy `serviceType=product` becomes `appointment`.

## v0.3.0 Scheduling Operations

Implemented:

- Six service types: product booking, in-store appointment, home/onsite service, consultation, class/course, and other standalone service.
- Standalone booking pages at `/book/:ruleId`, sharing the same booking engine, customer management token, email notifications, and merchant booking records as product App Block bookings.
- Calendar and list views for daily operations, with service/status/date/search filters and CSV export.
- Merchant lifecycle statuses: `confirmed`, `completed`, `no_show`, and `cancelled`, with append-only activity events.
- Per-service **capacity** from 1–100 spots. MongoDB reserves a deterministic position inside each slot so simultaneous requests cannot overbook capacity.
- **Minimum notice** to prevent last-minute appointments.
- **Booking window** to control how far ahead customers can reserve.
- **Availability exceptions** for holidays, one-off closures, and special hours. Exceptions can also open a date that is normally closed in the weekly schedule.
- Product services keep the zero-configuration SHOPLINE Theme App Block. Standalone services do not require theme editing.
- The first-install Quickstart still presents the App Block first for product appointments, but standalone-service merchants can continue directly to service creation.
- Responsive English/Simplified Chinese merchant workspace, Arctic Blue visual system, per-store Email Studio, Quickstart/Setup, secure customer management links, and server-authoritative store-time-zone validation are retained.
- Appointment Lite does not gate service-count or notification/calendar capabilities behind Free/Pro feature tiers.

For home/onsite services, merchants can use the existing required custom-question field to collect a service address or access instructions. A structured address/resource-routing model remains intentionally deferred so the Lite product does not inherit full field-service-management complexity yet.

Intentionally deferred: Google/Outlook Calendar sync, SMS, deposits, per-staff resource calendars, travel zones/routing, recurring appointments.

## Lightweight architecture

```text
SHOPLINE Admin
  ├─ product service ──> Appointment Rule ─┐
  └─ standalone service ────────────────┐  │
                                        v  v
                                  Node.js API ──> MongoDB
                                      │
                    ┌─────────────────┴──────────────────┐
                    │                                    │
           Product Theme App Block              Hosted /book/:ruleId
                    │                                    │
                    └──── availability + booking POST ───┘
                                      │
                          optional email notification
```

Static UI and slot generation run mostly in the browser. Public availability is uncached and capacity-aware; the final booking insert is authoritative. MongoDB owns the capacity-position uniqueness guarantee, so concurrent customers cannot exceed the configured slot capacity.

Appointment rule times are canonical in each service time zone; services with no override inherit the SHOPLINE store time zone. The backend remains authoritative for create, customer reschedule, and merchant edit operations and rejects elapsed slots, slots outside the booking window, slots inside the minimum-notice period, and full-capacity slots.

## Project layout

```text
src/
  lib/                 signatures, slot generation, booking modes, scheduling policies, validation
  middleware/          stateless admin session, CSRF, errors
  models/              Shop, AppointmentRule, Booking, BookingReservation
  routes/              OAuth, admin API, public booking API
  services/            SHOPLINE, booking, email, calendar synchronization
  views/                admin shell + hosted standalone booking page
public/admin/           merchant admin workspace
public/manage/          cross-device customer management page
public/book/            standalone service booking UI
theme-extension-source/ SHOPLINE product App Block source
test/                   Node test runner suites
docs/                   data model and API notes
```

## Requirements

- Node.js 20+
- MongoDB 6+
- A SHOPLINE public or custom app
- HTTPS URL for production callbacks
- Optional: Aliyun DirectMail with a least-privilege RAM user, or Resend
- Optional: Railway CLI and SHOPLINE CLI

## Environment

Copy `.env.example` to `.env` and fill at least:

```dotenv
APP_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/appointment-lite
MONGODB_DB_NAME=shopline_appointment_lite
SHOPLINE_APP_KEY=...
SHOPLINE_APP_SECRET=...
SESSION_SECRET=...
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=https://appointment.toolkit.fans/integrations/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=...
```

Important settings:

- `SHOPLINE_API_VERSION` defaults to `v20260301` and is centralized for upgrades.
- `MONGODB_DB_NAME` selects an isolated logical database inside the MongoDB service. It defaults to `shopline_appointment_lite`, so Railway can safely provide `MONGODB_URI=${{MongoDB.MONGO_URL}}` without URI string concatenation.
- `SHOPLINE_SCOPES` defaults to `read_products,read_store_information,read_content`; `read_content` is used only to locate the published theme for the App Block deep link.
- `SHOPLINE_THEME_EXTENSION_UUID` comes from the CLI-created Theme App Extension `.env`; it enables the one-click product-template editor link. `SHOPLINE_THEME_BLOCK_HANDLE` defaults to `appointment-lite`.
- `COOKIE_SAME_SITE=lax` is appropriate for redirect mode. Embedded iframe mode may require `none` with HTTPS and SHOPLINE App Bridge work.
- `PUBLIC_ALLOWED_ORIGINS` should remain empty for a multi-merchant public app because every merchant has different storefront domains. CORS is not authentication; use dynamic installed-shop origin validation in a later hardening release if required.
- `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` come from a Google Cloud OAuth **Web application** client. `GOOGLE_CALENDAR_REDIRECT_URI` must exactly match an authorized redirect URI in that client.
- `GOOGLE_TOKEN_ENCRYPTION_KEY` must be a dedicated 32-byte secret (64 hex characters or base64) used to encrypt stored Google refresh tokens with AES-256-GCM. Keep it stable across deploys; rotating it requires a migration or reconnecting calendars.
- `EMAIL_PROVIDER=auto` prefers a complete Aliyun DirectMail configuration, then Resend. Use `aliyun`, `resend`, or `none` to force a mode.
- Aliyun DirectMail uses HTTPS OpenAPI rather than SMTP. Configure `ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_ACCESS_KEY_SECRET`, and the verified sender in `ALIYUN_DIRECTMAIL_ACCOUNT_NAME`.
- `RESEND_API_KEY`, `EMAIL_FROM`, and `MERCHANT_NOTIFICATION_EMAIL` remain available as a fallback. Booking success never depends on email delivery.
- See [Aliyun DirectMail and Resend setup](docs/EMAIL.md) before adding production credentials to Railway.

Generate secrets on macOS:

```bash
openssl rand -hex 32
```

## SHOPLINE app configuration

In SHOPLINE Developer Center:

1. Set the App URL to `https://YOUR_DOMAIN/`.
2. Set the callback URL to `https://YOUR_DOMAIN/auth/callback`.
3. Request `read_products`, `read_store_information`, and `read_content`. Existing development installs must authorize again after adding `read_content`.
4. Use Redirect display mode for this MVP.
5. Copy the app key and secret into Railway variables.

The root route forwards SHOPLINE's signed installation query to `/auth/install`. Both the installation request and OAuth callback are verified with HMAC-SHA256 and a ten-minute timestamp window. See SHOPLINE's official [app authorization](https://developer.shopline.com/docs/apps/api-instructions-for-use/app-authorization/?version=v20260301) and [signature](https://developer.shopline.com/docs/apps/api-instructions-for-use/generate-and-verify-signatures/?lang=en) documentation.

## Local run

```bash
cp .env.example .env
npm install
npm test
npm run check
npm run dev
```

Open `http://localhost:3000/health`. A real OAuth install needs an HTTPS tunnel whose URL is configured as `APP_URL` and in SHOPLINE Developer Center.

## Railway deployment

1. Provision MongoDB or supply a reachable MongoDB Atlas URI.
2. Create/link the app service and set all production variables from `.env.example`.
3. Ensure `APP_URL` is the Railway public HTTPS domain.
4. Deploy:

```bash
railway link
railway up
railway domain
```

`railway up` uploads and deploys the current project; it does not create a public domain by itself. After a domain is available, update `APP_URL` and the SHOPLINE callback configuration, then redeploy.


## Release packaging

Create a clean distributable ZIP with:

```bash
npm run release:zip
```

The release builder excludes local or sensitive development state such as `.git/`, `.env`, `node_modules/`, `dist/`, and the locally bound `theme-app-extension/` directory.

Keep the SHOPLINE CLI-created Theme App Extension on the developer machine. The portable source remains in `theme-extension-source/` and is synchronized into the bound extension before `sl extension push`.

## Theme App Extension: manual CLI creation

The repository deliberately does not contain a fake `.shopline-cli.yml`. Sign in and let SHOPLINE CLI create/associate the extension:

```bash
cd /path/to/appointment-lite
sl extension create --name theme-app-extension
# Select Theme App Extension and the intended SHOPLINE app.

rsync -a theme-extension-source/blocks/ theme-app-extension/blocks/
rsync -a theme-extension-source/public/ theme-app-extension/public/
rsync -a theme-extension-source/i18n/ theme-app-extension/i18n/

cd theme-app-extension
sl extension push
```

In the Theme Editor, add **Appointment Lite** to the product template. The block has no settings: adding it is the switch on, and removing it is the switch off. The extension automatically reads `{{ shop.id }}` and `{{ product.id }}`; its production API URL is fixed in the extension asset.

After CLI creation, copy the extension's `EXTENSION_UUID` value into `SHOPLINE_THEME_EXTENSION_UUID` in the app service and redeploy. **Storefront setup** can then locate the published theme and open the official product-template App Block deep link in a new window. If an older installation has not granted `read_content`, the button safely opens the theme list until the app is authorized again.

The App Block starts hidden and only appears after the public rule endpoint confirms that the current product has an enabled rule. Theme-editor re-renders are handled through SHOPLINE events plus a DOM observer. The production API origin is `https://appointment.toolkit.fans`. Open the preview console and filter for `[Appointment Lite]` to see store/product identity, cache, request status, visibility decisions, availability, and booking diagnostics without logging customer PII. SHOPLINE documents the OS 3.0 [extension structure](https://developer.shopline.com/docs/online-store-3-0-themes/integrate-apps-with-themes/theme-app-extension/structure?version=v20231201) and [`sl extension push`](https://developer.shopline.com/docs/online-store-3-0-themes/development-tools/cli/app-extension-commands/).

After a successful booking, the storefront stores a minimal receipt (booking ID, private management token, date, time, location, staff, and reschedule count) in that browser's local storage. On later visits to the same product, the block shows the confirmed appointment and a “Manage appointment” action. The confirmation email also contains a cross-device magic link. Email links carry a high-entropy `access` value for compatibility with clients that discard URL fragments. The management response is `no-store` with a `no-referrer` policy; JavaScript immediately moves the token to session storage and replaces the visible URL with the booking ID only. Legacy fragment links remain supported.

The customer can securely reschedule once or cancel without exposing customer PII or allowing management access by booking ID alone. The first change screen warns that it is the only online change; later attempts are rejected by the backend and direct the customer to contact the store. Merchants can edit confirmed bookings without consuming the customer allowance. Confirmation, reschedule, cancellation, and merchant-edit emails safely skip or report failure without reverting the booking. The backend stores only a SHA-256 hash of the management token. A compatibility lookup for pre-v0.1.5 receipts returns only `confirmed` or `cancelled`, requires matching store and product IDs, and never grants management access.

## Tests and checks

```bash
npm test
npm run check
```

Tests cover query/session signing, weekday/date bounds, store-time-zone past-slot filtering, duration and buffer generation, standalone one-off availability, availability exceptions, minimum notice, booking windows, capacity allocation under duplicate-key races, rule/booking validation, booking lifecycle events, hosted booking UI, App Block behavior, and merchant scheduling operations.

## Security and production checklist

- Use a 32+ character `SESSION_SECRET` and HTTPS `APP_URL`.
- Keep `PUBLIC_ALLOWED_ORIGINS` empty for multi-merchant distribution; add dynamic installed-shop origin validation if CORS tightening is later required.
- Keep MongoDB private and enable backups.
- Add SHOPLINE mandatory GDPR/uninstall webhooks before marketplace review.
- Add bot protection and a stricter distributed rate limiter before high-volume public launch.
- Confirm token-refresh behavior against the app type and current SHOPLINE API version.
- Keep `theme-extension-source/` free of app credentials and never reuse another app's CLI metadata.

## Data and API references

- [Data model and atomic conflict design](docs/DATA_MODEL.md)
- [HTTP API summary](docs/API.md)
- [Aliyun DirectMail and Resend setup](docs/EMAIL.md)
- [Google Calendar setup and security](docs/GOOGLE_CALENDAR.md)
- [Paid booking checkout and webhook lifecycle](docs/PAID_BOOKING.md)
- [Mac ZIP overlay/install procedure](docs/INSTALL_MAC.md)

## License

Private MVP. Add the desired license before public distribution.


## v0.5.2 — Staff exception availability clarity

Staff schedule exceptions now explicitly explain that they only change the employee schedule. A service date must also be open in the service availability configuration. Public availability responses include reason codes so storefronts can distinguish a closed service date, policy restriction, full capacity, missing staff selection, and staff unavailability instead of showing one generic empty state.

## v0.6.0.5 — Notification controls and calendar overflow

- Staff portrait helper copy now follows the merchant admin locale, including the built-in/custom portrait labels and upload guidance in Simplified Chinese.
- Month calendar cells keep a compact three-booking preview. Overflow is now an interactive `View N more` action that opens a day-detail dialog with every appointment and lets the merchant continue into the normal booking workflow.
- Email Studio now gives merchants independent customer and merchant switches for confirmations/new bookings, changes, cancellations, and pre-appointment reminders.
- Pre-appointment reminders can be scheduled 3, 6, 12, 24, 48, or 72 hours before the appointment. A lightweight Mongo-backed delivery ledger prevents duplicate reminder sends and handles each multi-session occurrence independently.
- Storefront confirmation copy no longer promises that an email was sent when the merchant has disabled customer confirmation emails.

### v0.7.0.1 trial-day display hotfix

- Prevents a SHOPLINE 7-day trial from displaying as 8 days when `end_at` is rounded slightly beyond an exact 7 x 24-hour interval.
- Keeps SHOPLINE `end_at` unchanged for real access control.
