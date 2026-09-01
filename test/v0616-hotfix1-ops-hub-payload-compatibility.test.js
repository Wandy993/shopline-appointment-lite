import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeOpsHubPayload,
  opsHubDiagnosticLine,
  opsHubResponseDetail,
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

test('v0.6.16-hotfix.1 legacy payloads are upgraded into the strict Hub event envelope', () => {
  const heartbeat = normalizeOpsHubPayload({
    eventType: 'app.heartbeat',
    occurredAt: '2026-08-28T01:11:48.000Z',
    appVersion: '0.6.16',
    environment: 'production',
    metadata: { operation: 'heartbeat', durationMs: 12345 }
  });
  assert.equal(heartbeat.type, 'app.heartbeat');
  assert.equal(heartbeat.occurredAt, '2026-08-28T01:11:48.000Z');
  assert.match(heartbeat.eventId, /^appointment-lite:app\.heartbeat:/);
  assert.deepEqual(heartbeat.data, { version: '0.6.16', environment: 'production' });

  for (const eventType of ['shop.installed', 'shop.uninstalled', 'shop.active']) {
    const payload = normalizeOpsHubPayload({
      eventType,
      occurredAt: '2026-08-28T01:11:48.000Z',
      appVersion: '0.6.16',
      environment: 'production',
      shopId: 'shopline-store-123',
      shopHandle: 'apptest',
      shopDomain: 'apptest.myshopline.com',
      metadata: { reinstall: true, source: 'admin' }
    });
    assert.equal(payload.type, eventType);
    assert.equal(payload.data.shop.externalStoreId, 'shopline-store-123');
    assert.equal(payload.data.shop.handle, 'apptest');
    if (eventType === 'shop.active') assert.equal(payload.data.source, 'admin');
  }
});

test('v0.6.16-hotfix.1 keeps rich metadata only in health.event', () => {
  const health = normalizeOpsHubPayload({
    eventType: 'health.event',
    occurredAt: '2026-08-28T01:11:48.000Z',
    appVersion: '0.6.16',
    environment: 'production',
    message: 'availability.slow',
    metadata: { reason: 'availability.slow', category: 'performance', severity: 'warning', durationMs: 1800 }
  });
  assert.equal(health.data.eventType, 'availability.slow');
  assert.equal(health.data.status, 'warn');
  assert.equal(health.data.metadata.durationMs, 1800);
});

test('v0.6.16-hotfix.1 exposes safe 422 schema issues instead of only Invalid ingest payload', async () => {
  await assert.rejects(
    sendOpsHubPayload({
      eventType: 'app.heartbeat',
      occurredAt: '2026-08-28T01:11:48.000Z',
      appVersion: '0.6.16',
      environment: 'production'
    }, {
      runtimeConfig,
      fetchImpl: async () => new Response(JSON.stringify({
        message: 'Invalid ingest payload.',
        issues: [{ code: 'unrecognized_keys', keys: ['metadata'], path: [], message: "Unrecognized key(s) in object: 'metadata'" }]
      }), { status: 422, headers: { 'content-type': 'application/json' } })
    }),
    error => {
      assert.equal(error?.status, 422);
      assert.match(error?.message || '', /Invalid ingest payload/);
      assert.match(error?.message || '', /metadata/);
      assert.match(error?.message || '', /unrecognized_keys/);
      return true;
    }
  );
});

test('v0.6.16-hotfix.1 response diagnostics only summarize schema-safe issue fields', () => {
  const detail = opsHubResponseDetail({
    message: 'Invalid ingest payload.',
    issues: [{ code: 'invalid_type', path: ['counters', 'foo'], expected: 'number', received: 'string', message: 'Expected number' }],
    payload: { customerEmail: 'must-not-appear@example.com' }
  });
  assert.match(detail, /Invalid ingest payload/);
  assert.match(detail, /counters\.foo/);
  assert.match(detail, /expected=number/);
  assert.doesNotMatch(detail, /must-not-appear|customerEmail/);
});

test('v0.6.16-hotfix.1 Railway delivery diagnostic is one parseable JSON line', () => {
  const line = opsHubDiagnosticLine('ops_hub.delivery_failed', {
    level: 'warn', eventType: 'app.heartbeat', statusCode: 422, attempt: 1,
    code: 'OPS_HUB_HTTP_ERROR', message: 'Invalid ingest payload.\nmetadata rejected'
  });
  assert.equal(line.includes('\n'), false);
  const parsed = JSON.parse(line);
  assert.equal(parsed.event, 'ops_hub.delivery_failed');
  assert.equal(parsed.statusCode, 422);
  assert.equal(parsed.message, 'Invalid ingest payload. metadata rejected');
});

test('v0.6.16-hotfix.1 startup retries prior 422 outbox rows after send-time normalization', async () => {
  const [opsHub, syncJob] = await Promise.all([
    source('src/services/ops-hub.js'),
    source('src/services/ops-hub-sync-job.js')
  ]);
  assert.match(opsHub, /lastStatusCode:\s*422/);
  assert.match(opsHub, /Retrying after Ops Hub payload compatibility normalization/);
  assert.match(opsHub, /normalizeOpsHubPayload\(event\.payload \|\| \{\}, \{ eventId:/);
  assert.match(syncJob, /requeueRecoverableOutboxEvents/);
});

test('heartbeat queue remains metadata-free and current health exposes the active release build', async () => {
  const [opsHub, app, release] = await Promise.all([
    source('src/services/ops-hub.js'),
    source('src/app.js'),
    source('scripts/build-release.sh')
  ]);
  assert.match(opsHub, /return queueOpsEvent\('app\.heartbeat'\);/);
  assert.doesNotMatch(opsHub, /operation:\s*'heartbeat'/);
  assert.match(app, /build:\s*'0\.8\.1\.2-service-wizard-simplification-ui-polish\.1'/);
  assert.match(release, /RELEASE_BUILD="service-wizard-simplification-ui-polish\.1"/);
  assert.match(release, /service-wizard-simplification-ui-polish/);
});
