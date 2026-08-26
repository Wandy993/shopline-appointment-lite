import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';

test('MongoDB uses an isolated default logical database name', () => {
  assert.equal(config.mongoDbName, process.env.MONGODB_DB_NAME || 'shopline_appointment_lite');
});

test('runtime configuration has no feature-tier or plan-limit switch', () => {
  assert.equal('planLimitsEnabled' in config, false);
  assert.equal('defaultPlan' in config, false);
});
