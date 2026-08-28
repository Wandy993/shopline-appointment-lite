import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpsHubEvent } from '../src/models/OpsHubEvent.js';
import { OpsUsageDaily } from '../src/models/OpsUsageDaily.js';
import {
  OPS_USAGE_KEYS,
  buildOpsHubHeaders,
  normalizeOpsHubPayload,
  normalizeUsageCounters,
  opsHealthDedupeKey,
  opsHubConfigured,
  opsHubRetryDelayMs,
  opsHubSignature,
  opsStoreIdentity,
  sanitizeOpsMetadata,
  usageBucketsToHubCounters,
  sendOpsHubPayload
} from '../src/services/ops-hub.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

const runtimeConfig = Object.freeze({
  enabled: true,
  ingestUrl: 'https://ops.example.test/api/ingest/v1/events',
  appKey: 'appointment-lite',
  ingestSecret: 'test-ingest-secret',
  appVersion: '0.6.16',
  environment: 'production',
  timeoutMs: 100
});

test('v0.6.16 signs the exact timestamp.raw-json body with HMAC-SHA256', () => {
  const timestamp = '1760000000000';
  const rawBody = JSON.stringify({ eventType: 'app.heartbeat', occurredAt: '2026-08-27T10:00:00.000Z' });
  const expected = crypto.createHmac('sha256', runtimeConfig.ingestSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  assert.equal(opsHubSignature(rawBody, timestamp, runtimeConfig.ingestSecret), expected);
  const headers = buildOpsHubHeaders(rawBody, timestamp, runtimeConfig);
  assert.equal(headers['X-Ops-App-Key'], 'appointment-lite');
  assert.equal(headers['X-Ops-Timestamp'], timestamp);
  assert.equal(headers['X-Ops-Signature'], `sha256=${expected}`);
});

test('v0.6.16 keeps a stable SHOPLINE store identity instead of a mutable custom domain', () => {
  const identity = opsStoreIdentity({
    _id: 'internal-id',
    handle: 'AppTest',
    shoplineStoreId: 'shopline-store-123',
    shopDomain: 'custom.example.com',
    primaryDomain: 'another.example.com',
    accessToken: 'must-not-leak'
  });
  assert.deepEqual(identity, {
    shopId: 'shopline-store-123',
    shopHandle: 'apptest',
    shopDomain: 'apptest.myshopline.com'
  });
  assert.doesNotMatch(JSON.stringify(identity), /token|secret|custom\.example/i);
});

test('v0.6.16 health metadata is allowlisted and strips customer PII and secrets', () => {
  const safe = sanitizeOpsMetadata({
    reason: 'availability.slow',
    category: 'performance',
    severity: 'warning',
    durationMs: 2384,
    ruleId: 'rule-1',
    statusCode: 503,
    customerEmail: 'buyer@example.com',
    phone: '+123456789',
    shippingAddress: 'private',
    accessToken: 'secret',
    payload: { customer: 'private' },
    arbitrary: 'should-drop'
  });
  assert.deepEqual(safe, {
    reason: 'availability.slow',
    category: 'performance',
    severity: 'warning',
    durationMs: 2384,
    ruleId: 'rule-1',
    statusCode: 503
  });
});

test('v0.6.16 daily usage counters normalize numeric strings and reject unknown Hub fields', () => {
  assert.ok(OPS_USAGE_KEYS.includes('app_api_availability_requests'));
  const counters = normalizeUsageCounters({
    app_api_availability_requests: '12',
    business_bookings_created: 3.2,
    external_email_failures: -4,
    currency: 'USD',
    amount: 199
  });
  assert.deepEqual(counters, {
    app_api_availability_requests: 12,
    business_bookings_created: 3
  });

  const payload = normalizeOpsHubPayload({
    eventType: 'usage.daily',
    occurredAt: '2026-08-27T10:00:00.000Z',
    appVersion: '0.6.16',
    environment: 'production',
    shopHandle: 'apptest',
    shopDomain: 'apptest.myshopline.com',
    date: '2026-08-26',
    counters: { ...counters, currency: 'USD', amount: 199 },
    currency: 'USD',
    amount: 199
  });
  assert.equal(payload.type, 'usage.daily');
  assert.equal(payload.data.dateKey, '2026-08-26');
  assert.deepEqual(payload.data.requestBuckets, counters);
  assert.deepEqual(payload.data.counters, usageBucketsToHubCounters(counters));
  assert.equal('currency' in payload.data, false);
  assert.equal('amount' in payload.data, false);
});

test('v0.6.16 rejects event types outside the strict Ops Hub contract', () => {
  assert.throws(() => normalizeOpsHubPayload({ eventType: 'subscription.snapshot' }), /Unsupported Ops Hub event type/);
  assert.throws(() => normalizeOpsHubPayload({ eventType: 'custom.event' }), /Unsupported Ops Hub event type/);
});

test('v0.6.16 health dedupe is stable and delivery backoff never drops below five seconds', () => {
  const first = opsHealthDedupeKey('email.send.failed', { handle: 'apptest' }, { statusCode: 500, errorCode: 'SMTP' });
  const second = opsHealthDedupeKey('email.send.failed', { handle: 'apptest' }, { statusCode: 500, errorCode: 'SMTP' });
  assert.equal(first, second);
  assert.equal(first.length, 40);
  assert.equal(opsHubRetryDelayMs(1, () => 0), 5000);
  assert.ok(opsHubRetryDelayMs(2, () => 0) >= 15000);
});

test('v0.6.16 sender posts one normalized signed event without re-stringifying after signing', async () => {
  let captured = null;
  const result = await sendOpsHubPayload({
    eventType: 'health.event',
    occurredAt: '2026-08-27T10:00:00.000Z',
    appVersion: '0.6.16',
    environment: 'production',
    shopHandle: 'apptest',
    shopDomain: 'apptest.myshopline.com',
    message: 'availability.slow',
    metadata: { reason: 'availability.slow', durationMs: 1800, customerEmail: 'drop@example.com' }
  }, {
    runtimeConfig,
    now: () => 1760000000000,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  assert.equal(result.ok, true);
  assert.equal(captured.url, runtimeConfig.ingestUrl);
  assert.equal(captured.options.method, 'POST');
  const parsed = JSON.parse(captured.options.body);
  assert.deepEqual(Object.keys(parsed), ['event']);
  assert.equal(parsed.event.type, 'health.event');
  assert.equal(parsed.event.data.eventType, 'availability.slow');
  assert.equal(parsed.event.data.metadata.reason, 'availability.slow');
  assert.equal('customerEmail' in parsed.event.data.metadata, false);
  const signature = opsHubSignature(captured.options.body, '1760000000000', runtimeConfig.ingestSecret);
  assert.equal(captured.options.headers['X-Ops-Signature'], `sha256=${signature}`);
});

test('v0.6.16 sender normalizes aborted deliveries into OPS_HUB_TIMEOUT', async () => {
  await assert.rejects(
    sendOpsHubPayload({
      eventType: 'app.heartbeat',
      occurredAt: '2026-08-27T10:00:00.000Z',
      appVersion: '0.6.16',
      environment: 'production'
    }, {
      runtimeConfig: { ...runtimeConfig, timeoutMs: 10 },
      fetchImpl: async () => {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      }
    }),
    error => error?.code === 'OPS_HUB_TIMEOUT' && error?.message === 'OPS_HUB_TIMEOUT'
  );
});

test('v0.6.16 outbox and usage retention use one explicit TTL index each', () => {
  const eventExpiry = OpsHubEvent.schema.indexes().filter(([keys]) => Object.keys(keys).length === 1 && keys.expiresAt === 1);
  const usageExpiry = OpsUsageDaily.schema.indexes().filter(([keys]) => Object.keys(keys).length === 1 && keys.expiresAt === 1);
  assert.equal(eventExpiry.length, 1);
  assert.equal(eventExpiry[0][1].expireAfterSeconds, 0);
  assert.equal(eventExpiry[0][1].name, 'ops_hub_outbox_ttl');
  assert.equal(usageExpiry.length, 1);
  assert.equal(usageExpiry[0][1].expireAfterSeconds, 0);
  assert.equal(usageExpiry[0][1].name, 'ops_usage_ttl');
});

test('v0.6.16 requires explicit enablement, endpoint and an app-specific ingest secret', () => {
  assert.equal(opsHubConfigured({ enabled: false, ingestUrl: 'x', appKey: 'appointment-lite', ingestSecret: 'secret' }), false);
  assert.equal(opsHubConfigured({ enabled: true, ingestUrl: '', appKey: 'appointment-lite', ingestSecret: 'secret' }), false);
  assert.equal(opsHubConfigured({ enabled: true, ingestUrl: 'https://ops.test', appKey: 'appointment-lite', ingestSecret: '' }), false);
  assert.equal(opsHubConfigured({ enabled: true, ingestUrl: 'https://ops.test', appKey: 'appointment-lite', ingestSecret: 'unique-secret' }), true);
});

test('v0.6.16 wires lifecycle, activity, usage and health telemetry off the storefront critical path', async () => {
  const [server, db, authRoute, adminAuth, adminRoute, publicRoute, webhookRoute, shopline, paid, calendar, email, reminders, theme] = await Promise.all([
    source('src/server.js'),
    source('src/db.js'),
    source('src/routes/auth.js'),
    source('src/middleware/auth.js'),
    source('src/routes/admin.js'),
    source('src/routes/public.js'),
    source('src/routes/shopline-webhooks.js'),
    source('src/services/shopline.js'),
    source('src/services/paid-bookings.js'),
    source('src/services/calendar-sync.js'),
    source('src/services/email.js'),
    source('src/services/reminders.js'),
    source('theme-extension-source/public/appointment-lite.js')
  ]);

  assert.match(server, /startOpsHubScheduler/);
  assert.match(db, /OpsHubEvent\.syncIndexes/);
  assert.match(db, /OpsUsageDaily\.syncIndexes/);
  assert.match(authRoute, /queueShopInstalled/);
  assert.match(authRoute, /queueShopActive/);
  assert.match(adminAuth, /void queueShopActive\(shop\)/);
  assert.match(adminRoute, /app_api_admin_requests/);
  assert.match(publicRoute, /app_api_availability_requests/);
  assert.match(publicRoute, /availability\.slow/);
  assert.match(publicRoute, /business_bookings_created/);
  assert.match(publicRoute, /business_bookings_cancelled/);
  assert.match(publicRoute, /business_bookings_rescheduled/);
  assert.match(webhookRoute, /apps\/installed_uninstalled/);
  assert.match(webhookRoute, /queueShopUninstalled/);
  assert.match(shopline, /shopline\.api\.failed/);
  assert.match(shopline, /shopline\.token\.refresh\.failed/);
  assert.match(paid, /order\.reconciliation\.failed/);
  assert.match(calendar, /google\.calendar\.sync\.failed/);
  assert.match(email, /email\.send\.failed/);
  assert.match(reminders, /reminder\.send\.failed/);
  assert.doesNotMatch(theme, /ops[-_ ]?hub/i);
});

test('v0.6.16 environment template never enables Ops Hub or contains an ingest secret by default', async () => {
  const env = await source('.env.example');
  assert.match(env, /OPS_HUB_ENABLED=false/);
  assert.match(env, /OPS_HUB_APP_KEY=appointment-lite/);
  assert.match(env, /OPS_HUB_INGEST_SECRET=\s*(?:\r?\n|$)/);
  assert.match(env, /toolkit-ops-hub-production\.up\.railway\.app\/api\/ingest\/v1\/events/);
  assert.doesNotMatch(env, /OPS_HUB_INGEST_SECRET=\S+/);
});

test('current release identity stays aligned while retaining Ops Hub observability', async () => {
  const [pkgRaw, app, adminView, bookView, theme, release] = await Promise.all([
    source('package.json'), source('src/app.js'), source('src/views/admin.js'), source('src/views/book.js'),
    source('theme-extension-source/public/appointment-lite.js'), source('scripts/build-release.sh')
  ]);
  const pkg = JSON.parse(pkgRaw);
  assert.equal(pkg.version, '0.7.0');
  assert.match(app, /version: '0\.7\.0'/);
  assert.match(adminView, /styles\.css\?v=0\.7\.0/);
  assert.match(bookView, /app\.js\?v=0\.7\.0/);
  assert.match(theme, /const VERSION = '0\.7\.0'/);
  assert.match(release, /RELEASE_VERSION="0\.7\.0"/);
  assert.match(release, /shopline-subscription-integration/);
});
