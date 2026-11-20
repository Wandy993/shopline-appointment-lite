import { AsyncLocalStorage } from 'node:async_hooks';

const executionContextStorage = new AsyncLocalStorage();

export function runWithExecutionContext(context, callback) {
  return executionContextStorage.run(context || null, callback);
}

export function scheduleBackgroundTask(task, label = 'background-task') {
  const promise = Promise.resolve().then(task);
  const context = executionContextStorage.getStore();

  const tracked = promise.catch(error => {
    console.error(\`Appointment Lite background task failed (\${label})\`, {
      name: error?.name || 'Error',
      code: error?.code || '',
      message: String(error?.message || error).slice(0, 400)
    });
  });

  if (context && typeof context.waitUntil === 'function') {
    context.waitUntil(tracked);
  } else {
    // Local Node.js/test fallback. Production Worker requests always provide ctx.
    void tracked;
  }

  return tracked;
}
