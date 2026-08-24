import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';

test('MongoDB uses an isolated default logical database name', () => {
  assert.equal(config.mongoDbName, process.env.MONGODB_DB_NAME || 'shopline_appointment_lite');
});

test('plan limits are disabled by default during the MVP', () => {
  assert.equal(config.planLimitsEnabled, process.env.PLAN_LIMITS_ENABLED === 'true');
});
