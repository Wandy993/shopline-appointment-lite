import { expirePendingPaidBookings } from './bookings.js';

export function startPaidBookingScheduler({ intervalMs = 60_000, initialDelayMs = 10_000 } = {}) {
  let stopped = false;
  let running = false;
  let timer;

  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const result = await expirePendingPaidBookings();
      if (result.expired) console.log('Expired paid booking holds', result);
    } catch (error) {
      console.error('Paid booking hold scheduler failed', error.message);
    } finally {
      running = false;
    }
  };

  const startTimer = setTimeout(() => {
    run();
    timer = setInterval(run, intervalMs);
    timer.unref?.();
  }, initialDelayMs);
  startTimer.unref?.();

  return {
    stop() {
      stopped = true;
      clearTimeout(startTimer);
      if (timer) clearInterval(timer);
    },
    run
  };
}
