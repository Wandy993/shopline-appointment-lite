import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookingRateLimitMiddleware } from '../src/middleware/booking-rate-limit.js';

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) { this.headers[name] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; }
  };
}

function createRequest(ip = '203.0.113.10', limiter = null) {
  return {
    ip,
    headers: {},
    app: { locals: { bookingRateLimiter: limiter } },
    get(name) { return this.headers[name.toLowerCase()]; }
  };
}

test('local booking rate limiter allows ten requests and rejects the eleventh', async () => {
  const middleware = createBookingRateLimitMiddleware();
  const req = createRequest();
  for (let index = 0; index < 10; index += 1) {
    const res = createResponse();
    let called = false;
    await middleware(req, res, () => { called = true; });
    assert.equal(called, true);
    assert.equal(res.statusCode, 200);
  }
  const res = createResponse();
  let called = false;
  await middleware(req, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.error, 'RATE_LIMITED');
});

test('booking rate limiter uses the Cloudflare binding when present', async () => {
  let receivedKey = '';
  const limiter = {
    async limit(input) {
      receivedKey = input.key;
      return { success: true };
    }
  };
  const req = createRequest('198.51.100.20', limiter);
  const res = createResponse();
  let called = false;
  await createBookingRateLimitMiddleware()(req, res, () => { called = true; });
  assert.equal(receivedKey, 'booking:198.51.100.20');
  assert.equal(called, true);
});

test('Cloudflare rate limit rejection returns the existing RATE_LIMITED response', async () => {
  const limiter = { async limit() { return { success: false }; } };
  const req = createRequest('198.51.100.21', limiter);
  const res = createResponse();
  let called = false;
  await createBookingRateLimitMiddleware()(req, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.error, 'RATE_LIMITED');
  assert.equal(res.headers['Retry-After'], '60');
});
