import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';

test('MongoDB uses an isolated default logical database name', () => {
  assert.equal(config.mongoDbName, process.env.MONGODB_DB_NAME || 'shopline_appointment_lite');
});
