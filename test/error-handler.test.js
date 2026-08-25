import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { errorHandler } from '../src/middleware/errors.js';

test('Mongoose validation errors return actionable 422 responses instead of generic 500s', () => {
  const source = new mongoose.Error.ValidationError();
  source.addError('sessionsRequired', new mongoose.Error.ValidatorError({ path: 'sessionsRequired', message: 'sessionsRequired must be at least 1.' }));
  let statusCode = 0;
  let body = null;
  const res = {
    headersSent: false,
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; }
  };
  const original = console.error;
  console.error = () => {};
  try { errorHandler(source, {}, res, () => {}); } finally { console.error = original; }
  assert.equal(statusCode, 422);
  assert.equal(body.error, 'VALIDATION_ERROR');
  assert.match(body.message, /sessionsRequired must be at least 1/);
});
