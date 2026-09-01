import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeOpsHubPayload,
  opsHubStoreIdentity,
  opsHubSignature,
  sendOpsHubPayload,
  usageBucketsToHubCounters
} from '../src/services/ops-hub.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');

const runtimeConfig = Object.freeze({
  enabled: true,
  ingestUrl: 'https://ops.example.test/api/ingest/v1/events',
  appKey: 'appointment-lite',
  ingestSecret: 'contract-test-secret',
  appVersion: '0.6.16',
  environment: 'production',
  timeoutMs: 100
});

function exactKeys(object, expected) {
  assert.deepEqual(Object.keys(object).sort(), [...expected].sort());
}

function assertBaseEvent(event, type) {
  exactKeys(event, ['eventId', 'occurredAt', 'type', 'data']);
  assert.equal(event.type, type);
  assert.match(event.eventId, /^[A-Za-z0-9._:-]{8,160}$/);
  assert.doesNotThrow(() => new Date(event.occurredAt).toISOString());
}

test('v0.6.16-hotfix.2 heartbeat matches Toolkit Ops Hub eventBase + heartbeat data schema exactly', () => {
  const event = normalizeOpsHubPayload({
    eventId: 'appointment-lite:heartbeat:test-0001',
    eventType: 'app.heartbeat',
    occurredAt: '2026-08-28T02:00:00.000Z',
    appVersion: '0.6.16',
    environment: 'production',
    metadata: { operation: 'must-not-be-heartbeat-data' }
  });
  assertBaseEvent(event, 'app.heartbeat');
  assert.deepEqual(event.data, { version: '0.6.16', environment: 'production' });
  assert.equal('eventType' in event, false);
  assert.equal('appVersion' in event, false);
  assert.equal('environment' in event, false);
});

test('v0.6.16-hotfix.2 sender signs the exact {event:{...}} request body required by Ops Hub', async () => {
  let captured;
  await sendOpsHubPayload({
    eventId: 'appointment-lite:heartbeat:test-0002',
    eventType: 'app.heartbeat',
    occurredAt: '2026-08-28T02:01:00.000Z',
    appVersion: '0.6.16',
    environment: 'production'
  }, {
    runtimeConfig,
    now: () => 1760000000000,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ ok: true, processed: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  const body = JSON.parse(captured.options.body);
  exactKeys(body, ['event']);
  assertBaseEvent(body.event, 'app.heartbeat');
  const expected = opsHubSignature(captured.options.body, '1760000000000', runtimeConfig.ingestSecret);
  assert.equal(captured.options.headers['X-Ops-Signature'], `sha256=${expected}`);
  assert.equal(
    expected,
    crypto.createHmac('sha256', runtimeConfig.ingestSecret)
      .update(`1760000000000.${captured.options.body}`)
      .digest('hex')
  );
});

test('v0.6.16-hotfix.2 SHOPLINE store identity matches Hub externalStoreId/handle/shopName/primaryDomain schema', () => {
  const shop = opsHubStoreIdentity({
    handle: 'AppTest',
    shoplineStoreId: 'shopline-store-123',
    primaryDomain: 'booking.example.com'
  });
  assert.deepEqual(shop, {
    externalStoreId: 'shopline-store-123',
    handle: 'apptest',
    shopName: 'apptest',
    primaryDomain: 'booking.example.com'
  });

  const installed = normalizeOpsHubPayload({
    eventId: 'appointment-lite:install:test-0001',
    eventType: 'shop.installed',
    occurredAt: '2026-08-28T02:02:00.000Z',
    shop: {
      handle: 'AppTest',
      shoplineStoreId: 'shopline-store-123',
      primaryDomain: 'booking.example.com',
      installedAt: '2026-08-28T02:01:00.000Z'
    },
    metadata: { source: 'oauth', reinstall: true }
  });
  assertBaseEvent(installed, 'shop.installed');
  exactKeys(installed.data.shop, ['externalStoreId', 'handle', 'shopName', 'primaryDomain']);
  assert.equal(installed.data.shop.externalStoreId, 'shopline-store-123');
  assert.equal(installed.data.installedAt, '2026-08-28T02:01:00.000Z');
  assert.deepEqual(installed.data.metadata, { source: 'oauth', reinstall: true });

  const active = normalizeOpsHubPayload({
    eventId: 'appointment-lite:active:test-0001',
    eventType: 'shop.active',
    occurredAt: '2026-08-28T02:03:00.000Z',
    shop: { handle: 'apptest', shoplineStoreId: 'shopline-store-123' },
    metadata: { source: 'admin' }
  });
  assertBaseEvent(active, 'shop.active');
  assert.equal(active.data.source, 'admin');
  assert.equal(active.data.lastSeenAt, '2026-08-28T02:03:00.000Z');
});

test('v0.6.16-hotfix.2 health.event maps warning to warn and uses the Hub nested data contract', () => {
  const event = normalizeOpsHubPayload({
    eventId: 'appointment-lite:health:test-0001',
    eventType: 'health.event',
    occurredAt: '2026-08-28T02:04:00.000Z',
    shop: { handle: 'apptest', shoplineStoreId: 'shopline-store-123' },
    message: 'Storefront availability exceeded the warning threshold.',
    metadata: {
      reason: 'availability.slow',
      category: 'performance',
      severity: 'warning',
      durationMs: 1800,
      ruleId: 'rule-1',
      customerEmail: 'must-not-leak@example.com'
    }
  });
  assertBaseEvent(event, 'health.event');
  assert.equal(event.data.category, 'performance');
  assert.equal(event.data.eventType, 'availability.slow');
  assert.equal(event.data.status, 'warn');
  assert.equal(event.data.durationMs, 1800);
  assert.match(event.data.reason, /duration=1800ms/);
  assert.equal(event.data.shop.externalStoreId, 'shopline-store-123');
  assert.equal('customerEmail' in event.data.metadata, false);
});

test('v0.6.16-hotfix.2 usage.daily emits only Hub counters plus detailed requestBuckets at app level', () => {
  const buckets = {
    app_api_admin_requests: 4,
    app_api_availability_requests: 12,
    app_api_booking_requests: 3,
    shopline_api_requests: 8,
    webhook_received: 5,
    health_errors: 2,
    business_bookings_created: 3,
    external_emails_sent: 6
  };
  assert.deepEqual(usageBucketsToHubCounters(buckets), {
    appApiCalls: 19,
    shoplineApiCalls: 8,
    webhookCalls: 5,
    errors: 2
  });

  const event = normalizeOpsHubPayload({
    eventId: 'appointment-lite:usage:test-0001',
    eventType: 'usage.daily',
    occurredAt: '2026-08-28T02:05:00.000Z',
    date: '2026-08-27',
    counters: buckets,
    shopId: 'must-not-be-sent-for-app-level-usage'
  });
  assertBaseEvent(event, 'usage.daily');
  exactKeys(event.data.counters, ['appApiCalls', 'shoplineApiCalls', 'webhookCalls', 'errors']);
  assert.equal(event.data.dateKey, '2026-08-27');
  assert.deepEqual(event.data.counters, {
    appApiCalls: 19,
    shoplineApiCalls: 8,
    webhookCalls: 5,
    errors: 2
  });
  assert.equal('shop' in event.data, false);
  assert.deepEqual(event.data.requestBuckets, buckets);
});

test('v0.6.16-hotfix.2 preserves old 422 recovery but supersedes legacy per-shop usage snapshots', async () => {
  const opsHub = await source('src/services/ops-hub.js');
  assert.match(opsHub, /eventType:\s*'usage\.daily'/);
  assert.match(opsHub, /Superseded by v0\.6\.16-hotfix\.2 app-level usage\.daily contract alignment/);
  assert.match(opsHub, /OpsUsageDaily\.updateMany\(\{ date: \{ \$in:/);
  assert.match(opsHub, /dedupeKey: `usage:\$\{date\}:__all__`/);
  assert.match(opsHub, /const requestBody = \{ event: normalized \}/);
});

test('current release identity advances without regressing the Ops Hub contract alignment', async () => {
  const [app, release] = await Promise.all([source('src/app.js'), source('scripts/build-release.sh')]);
  assert.match(app, /build:\s*'0\.8\.1-booking-model-storefront-placement\.1'/);
  assert.match(release, /RELEASE_VERSION="0\.8\.1"/);
  assert.match(release, /RELEASE_BUILD="booking-model-storefront-placement\.1"/);
  assert.match(release, /booking-model-storefront-placement/);
});
