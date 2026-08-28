import { config } from '../config.js';
import {
  flushOpsHubOutbox,
  opsHubConfigured,
  queueDailyUsageSnapshots,
  queueHeartbeat,
  requeueRecoverableOutboxEvents
} from './ops-hub.js';

export function startOpsHubScheduler({
  initialDelayMs = config.opsHub.initialSyncDelayMs,
  workerIntervalMs = config.opsHub.workerIntervalMs,
  heartbeatMs = config.opsHub.heartbeatMs,
  usageScanMs = 60 * 60_000
} = {}) {
  let stopped = false;
  let running = false;
  let lastHeartbeatAt = 0;
  let lastUsageScanAt = 0;
  let interval = null;

  if (!opsHubConfigured()) {
    return { enabled: false, stop() {}, async run() { return { skipped: true }; } };
  }

  const run = async () => {
    if (stopped || running) return { skipped: true, reason: stopped ? 'STOPPED' : 'RUNNING' };
    running = true;
    try {
      const now = Date.now();
      if (!lastHeartbeatAt || now - lastHeartbeatAt >= heartbeatMs) {
        lastHeartbeatAt = now;
        await queueHeartbeat();
      }
      if (!lastUsageScanAt || now - lastUsageScanAt >= usageScanMs) {
        lastUsageScanAt = now;
        await queueDailyUsageSnapshots();
      }
      return await flushOpsHubOutbox();
    } catch (error) {
      console.error('Ops Hub scheduler iteration failed', error.message);
      return { failed: true, message: error.message };
    } finally {
      running = false;
    }
  };

  const initial = setTimeout(async () => {
    try { await requeueRecoverableOutboxEvents(); }
    catch (error) { console.warn('Ops Hub outbox recovery failed', error.message); }
    await run();
    interval = setInterval(run, workerIntervalMs);
    interval.unref?.();
  }, initialDelayMs);
  initial.unref?.();

  return {
    enabled: true,
    run,
    stop() {
      stopped = true;
      clearTimeout(initial);
      if (interval) clearInterval(interval);
    }
  };
}
