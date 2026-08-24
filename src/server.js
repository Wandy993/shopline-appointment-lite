import { createApp } from './app.js';
import { assertProductionConfig, config } from './config.js';
import { connectDatabase, disconnectDatabase } from './db.js';

assertProductionConfig();
await connectDatabase();
const server = createApp().listen(config.port, () => console.log(`Appointment Lite listening on port ${config.port}`));

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
