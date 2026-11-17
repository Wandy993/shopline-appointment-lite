import { env } from 'cloudflare:workers';
import { handleAsNodeRequest } from 'cloudflare:node';

// Load Cloudflare variables and secrets before importing modules that snapshot
// process.env (config.js and the Express route/service graph).
const CONFIG_ENV_KEYS = [
  'NODE_ENV', 'PORT', 'APP_URL', 'SHOPLINE_APP_KEY', 'SHOPLINE_APP_SECRET',
  'SHOPLINE_SCOPES', 'SHOPLINE_API_VERSION', 'SHOPLINE_CALLBACK_PATH',
  'SHOPLINE_THEME_EXTENSION_UUID', 'SHOPLINE_THEME_BLOCK_HANDLE',
  'SHOPLINE_SUBSCRIPTION_ENABLED', 'SHOPLINE_PARTNER_TOKEN',
  'SHOPLINE_PARTNER_API_VERSION', 'SHOPLINE_SUBSCRIPTION_SPU_KEY',
  'SHOPLINE_SUBSCRIPTION_PACKAGE_ID', 'SHOPLINE_SUBSCRIPTION_PLAN_NAME',
  'SHOPLINE_SUBSCRIPTION_PRICE_USD', 'SHOPLINE_SUBSCRIPTION_TRIAL_DAYS',
  'SHOPLINE_SUBSCRIPTION_GRACE_HOURS', 'SHOPLINE_SUBSCRIPTION_SYNC_MAX_AGE_SECONDS',
  'SHOPLINE_SUBSCRIPTION_TIMEOUT_MS', 'SESSION_SECRET', 'COOKIE_SAME_SITE',
  'PUBLIC_ALLOWED_ORIGINS', 'LEGAL_OPERATOR_NAME', 'LEGAL_SUPPORT_EMAIL',
  'GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET',
  'GOOGLE_CALENDAR_REDIRECT_URI', 'GOOGLE_TOKEN_ENCRYPTION_KEY',
  'OPS_HUB_ENABLED', 'OPS_HUB_INGEST_URL', 'OPS_HUB_URL', 'OPS_HUB_APP_KEY',
  'OPS_HUB_INGEST_SECRET', 'APP_VERSION', 'APP_ENVIRONMENT',
  'OPS_HUB_TIMEOUT_MS', 'OPS_HUB_BATCH_SIZE', 'OPS_HUB_WORKER_INTERVAL_MS',
  'OPS_HUB_INITIAL_SYNC_DELAY_MS', 'OPS_HUB_HEARTBEAT_MS',
  'OPS_HUB_ACTIVE_THROTTLE_MS', 'OPS_HUB_HEALTH_DEDUPE_MS',
  'OPS_HUB_EVENT_RETENTION_DAYS', 'OPS_HUB_USAGE_RETENTION_DAYS',
  'EMAIL_PROVIDER', 'RESEND_API_KEY', 'EMAIL_FROM', 'MERCHANT_NOTIFICATION_EMAIL',
  'ALIBABA_CLOUD_ACCESS_KEY_ID', 'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
  'ALIBABA_CLOUD_SECURITY_TOKEN', 'ALIYUN_DIRECTMAIL_ACCOUNT_NAME',
  'ALIYUN_DIRECTMAIL_FROM_ALIAS', 'ALIYUN_DIRECTMAIL_REPLY_TO',
  'ALIYUN_DIRECTMAIL_ENDPOINT', 'ALIYUN_DIRECTMAIL_REGION_ID',
  'ALIYUN_DIRECTMAIL_TAG_NAME'
];

for (const key of CONFIG_ENV_KEYS) {
  const value = env[key];
  if (value !== undefined && value !== null) {
    process.env[key] = String(value);
  }
}

// Dynamic imports are intentional: config.js reads process.env at module load.
const [
  { createApp },
  { getProductionConfigIssues },
  { runWithDatabase },
  { processUpcomingEmailReminders },
  { reconcilePendingCommercePayments },
  { expirePendingPaidBookings },
  { processPostPurchaseScheduleNotifications },
  opsHub
] = await Promise.all([
  import('./app.js'),
  import('./config.js'),
  import('./db/orm.js'),
  import('./services/reminders.js'),
  import('./services/paid-bookings.js'),
  import('./services/bookings.js'),
  import('./services/post-purchase.js'),
  import('./services/ops-hub.js')
]);

const app = createApp({
  database: env.DB,
  assets: env.ASSETS,
  bookingRateLimiter: env.BOOKING_RATE_LIMITER
});
app.listen(3000);

async function runScheduledJobs(database) {
  return runWithDatabase(database, async () => {
    const results = {};
    results.reminders = await processUpcomingEmailReminders();
    results.payments = await reconcilePendingCommercePayments();
    results.expiredBookings = await expirePendingPaidBookings();
    results.postPurchaseEmails = await processPostPurchaseScheduleNotifications();
    if (opsHub.opsHubConfigured()) {
      await opsHub.requeueRecoverableOutboxEvents();
      await opsHub.queueDailyUsageSnapshots();
      results.opsHub = await opsHub.flushOpsHubOutbox();
    }
    return results;
  });
}

export default {
  fetch(request) {
    const issues = getProductionConfigIssues();
    if (issues.length) {
      console.error('Appointment Lite configuration is incomplete:', issues);
      return new Response(JSON.stringify({ ok: false, error: 'Service configuration is incomplete.', issues }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
      });
    }
    return handleAsNodeRequest(3000, request);
  },
  scheduled(controller, bindings, context) {
    context.waitUntil(runScheduledJobs(bindings.DB).then(result => {
      console.info('Appointment Lite scheduled tasks completed', result);
    }).catch(error => {
      console.error('Appointment Lite scheduled tasks failed', error);
      throw error;
    }));
  }
};
