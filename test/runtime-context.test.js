import test from 'node:test';
import assert from 'node:assert/strict';
import { runWithExecutionContext, scheduleBackgroundTask } from '../src/runtime-context.js';

test('background tasks are registered with the Cloudflare execution context', async () => {
  const pending = [];
  const context = { waitUntil(promise) { pending.push(promise); } };
  let completed = false;

  await runWithExecutionContext(context, async () => {
    scheduleBackgroundTask(async () => {
      await Promise.resolve();
      completed = true;
    }, 'test-calendar-sync');
  });

  assert.equal(pending.length, 1);
  await Promise.all(pending);
  assert.equal(completed, true);
});

test('background task failures are handled without unhandled rejections', async () => {
  const pending = [];
  const context = { waitUntil(promise) { pending.push(promise); } };
  await runWithExecutionContext(context, async () => {
    scheduleBackgroundTask(async () => { throw new Error('expected test failure'); }, 'test-failure');
  });
  await Promise.all(pending);
});
