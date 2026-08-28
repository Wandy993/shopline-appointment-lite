import { createApp } from './app.js';
import { assertProductionConfig, config } from './config.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import { startReminderScheduler } from './services/reminders.js';
import { startPaidBookingScheduler } from './services/paid-bookings.js';
import { startPostPurchaseNotificationScheduler } from './services/post-purchase.js';
import { startOpsHubScheduler } from './services/ops-hub-sync-job.js';

assertProductionConfig();
await connectDatabase();
const server = createApp().listen(config.port, () => console.log(`Appointment Lite listening on port ${config.port}`));
const reminderScheduler = startReminderScheduler();
const paidBookingScheduler = startPaidBookingScheduler();
const postPurchaseNotificationScheduler = startPostPurchaseNotificationScheduler();
const opsHubScheduler = startOpsHubScheduler();

async function shutdown(signal) {
  reminderScheduler.stop();
  paidBookingScheduler.stop();
  postPurchaseNotificationScheduler.stop();
  opsHubScheduler.stop();
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
