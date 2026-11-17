import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { createApp } from './app.js';
import { runWithDatabase } from './db/orm.js';
import { processUpcomingEmailReminders } from './services/reminders.js';
import { reconcilePendingCommercePayments, expirePendingPaidBookings } from './services/paid-bookings.js';
import { processPostPurchaseScheduleNotifications } from './services/post-purchase.js';
import { queueDailyUsageSnapshots, flushOpsHubOutbox, requeueRecoverableOutboxEvents, opsHubConfigured } from './services/ops-hub.js';

const app = createApp({ database: env.DB, assets: env.ASSETS });
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
  fetch: httpServerHandler({ port: 3000 }),
  scheduled(controller, bindings, context) {
    context.waitUntil(runScheduledJobs(bindings.DB).then(result => {
      console.info('Appointment Lite scheduled tasks completed', result);
    }).catch(error => {
      console.error('Appointment Lite scheduled tasks failed', error);
      throw error;
    }));
  }
};
