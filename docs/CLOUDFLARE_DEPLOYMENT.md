# Appointment Lite — Cloudflare Workers deployment

## Runtime

- Cloudflare Workers runs the Express 5 application through \`cloudflare:node\`.
- Cloudflare D1 is the only application database (binding: \`DB\`).
- Static files are served by Workers Static Assets (binding: \`ASSETS\`).
- Cron Triggers run reminder delivery, pending payment reconciliation, payment-hold expiry, post-purchase notifications, and the optional Ops Hub outbox.
- MongoDB and Railway are not part of the application runtime. Do not migrate any historical database data.

## Workers Builds

Connect \`Wandy993/shopline-appointment-lite\` to Cloudflare Workers Builds and use:

- Production branch: \`main\`
- Build command: \`npm run build:cloudflare\`
- Deploy command: \`npx --yes wrangler@4 deploy\`
- Root directory: repository root

The build command copies the Jost and Poppins font files into \`public/customer-fonts\` before Wrangler uploads Static Assets.

## D1

The production database is \`appointment-lite\`, binding \`DB\`. Its ID is configured in \`wrangler.toml\`.

Apply the initial schema once:

\`\`\`sh
npx --yes wrangler@4 d1 migrations apply appointment-lite --remote
\`\`\`

Do not import MongoDB records. The application is not yet live and starts with an empty database.

## Required Worker secrets

Set these under Worker → Settings → Variables and Secrets:

- \`SHOPLINE_APP_KEY\`
- \`SHOPLINE_APP_SECRET\`
- \`SESSION_SECRET\` (generate a new random value of at least 32 characters)

If \`SHOPLINE_SUBSCRIPTION_ENABLED=true\`, also set \`SHOPLINE_PARTNER_TOKEN\`.

## Optional secrets and variables

Copy only values that are actually configured in the current Railway service. Never commit secrets to GitHub.

- Google Calendar: \`GOOGLE_CALENDAR_CLIENT_ID\`, \`GOOGLE_CALENDAR_CLIENT_SECRET\`, \`GOOGLE_TOKEN_ENCRYPTION_KEY\`
- Aliyun DirectMail: \`ALIBABA_CLOUD_ACCESS_KEY_ID\`, \`ALIBABA_CLOUD_ACCESS_KEY_SECRET\`, optional \`ALIBABA_CLOUD_SECURITY_TOKEN\`
- Resend fallback: \`RESEND_API_KEY\`
- SHOPLINE Partner API: \`SHOPLINE_PARTNER_TOKEN\`
- Optional Ops Hub: \`OPS_HUB_INGEST_SECRET\` and \`OPS_HUB_INGEST_URL\`; Ops Hub is disabled by default so the app does not depend on its separate Railway-hosted service.

Other non-secret settings may be copied as Worker variables: \`SHOPLINE_SCOPES\`, \`SHOPLINE_API_VERSION\`, \`SHOPLINE_CALLBACK_PATH\`, \`SHOPLINE_THEME_EXTENSION_UUID\`, \`SHOPLINE_SUBSCRIPTION_ENABLED\`, \`SHOPLINE_SUBSCRIPTION_SPU_KEY\`, \`SHOPLINE_SUBSCRIPTION_PACKAGE_ID\`, \`SHOPLINE_SUBSCRIPTION_PLAN_NAME\`, \`SHOPLINE_SUBSCRIPTION_PRICE_USD\`, \`SHOPLINE_SUBSCRIPTION_TRIAL_DAYS\`, \`SHOPLINE_SUBSCRIPTION_GRACE_HOURS\`, \`SHOPLINE_SUBSCRIPTION_SYNC_MAX_AGE_SECONDS\`, \`SHOPLINE_SUBSCRIPTION_TIMEOUT_MS\`, \`COOKIE_SAME_SITE\`, \`PUBLIC_ALLOWED_ORIGINS\`, \`EMAIL_PROVIDER\`, \`EMAIL_FROM\`, \`MERCHANT_NOTIFICATION_EMAIL\`, \`GOOGLE_CALENDAR_REDIRECT_URI\`, \`LEGAL_OPERATOR_NAME\`, \`LEGAL_SUPPORT_EMAIL\`.

\`APP_URL\` is already set to \`https://appointment.shoplineapp.vip\`. Keep \`OPS_HUB_ENABLED=false\` unless the separate Ops Hub service is intentionally retained.

## Cutover

1. Create the Worker from the connected GitHub repository.
2. Apply the D1 schema.
3. Add required secrets and any optional integrations.
4. Deploy and verify \`/health\`, OAuth, admin, public availability, booking create/cancel, and the SHOPLINE webhook.
5. Add \`appointment.shoplineapp.vip\` as a Custom Domain after the Worker is healthy.
6. Only then remove the old Appointment Lite Railway service and MongoDB cluster.
