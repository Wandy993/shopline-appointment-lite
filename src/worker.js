import { env } from 'cloudflare:workers';
import { handleAsNodeRequest } from 'cloudflare:node';
import { createApp } from './app.js';
import { assertProductionConfig } from './config.js';
import { runWithDatabase } from './db/orm.js';
import { processUpcomingEmailReminders } from './services/reminders.js';
import { reconcilePendingCommercePayments } from './services/paid-bookings.js';
import { expirePendingPaidBookings } from './services/bookings.js';
import { processPostPurchaseScheduleNotifications } from './services/post-purchase.js';
import { queueDailyUsageSnapshots, flushOpsHubOutbox, requeueRecoverableOutboxEvents, opsHubConfigured } from './services/ops-hub.js';

const app = createApp({ database: env.DB, assets: env.ASSETS, bookingRateLimiter: env.BOOKING_RATE_LIMITER });
app.listen(3000);

async function runScheduledJobs(database) {
  return runWithDatabase(database, async () => {
    const results = {};
    results.reminders = await processUpcomingEmailReminders();
    results.payments = await reconcilePendingCommercePayments();
    results.expiredBookings = await expirePendingPaidBookings();
    results.postPurchaseEmails = await processPostPurchaseScheduleNotifications();
    if (opsHubConfigured()) {
      await requeueRecoverableOutboxEvents();
      await queueDailyUsageSnapshots();
      results.opsHub = await flushOpsHubOutbox();
    }
    return results;
  });
}

export default {
  fetch(request, bindings, context) {
    try {
      assertProductionConfig();
    } catch (error) {
      console.error('Appointment Lite configuration is incomplete:', error.message);
      return new Response(JSON.stringify({ ok: false, error: 'Service configuration is incomplete.' }), {
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
