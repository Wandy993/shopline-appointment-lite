import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { subscriptionNeedsRecoverySync } from '../src/services/subscription.js';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v0.7.0.3 only treats a healthy active subscription as cacheable', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');
  assert.equal(subscriptionNeedsRecoverySync({ status: 'active', expiresAt: new Date('2026-09-04T12:00:00.000Z') }, { enabled: true, now }), false);
  assert.equal(subscriptionNeedsRecoverySync({ status: 'expired', expiresAt: new Date('2026-08-28T00:00:00.000Z') }, { enabled: true, now }), true);
  assert.equal(subscriptionNeedsRecoverySync({ status: 'cancelled' }, { enabled: true, now }), true);
  assert.equal(subscriptionNeedsRecoverySync({ status: 'none' }, { enabled: true, now }), true);
  assert.equal(subscriptionNeedsRecoverySync({ status: 'active', expiresAt: new Date('2026-08-26T00:00:00.000Z') }, { enabled: true, now }), true);
});

test('v0.7.0.3 inactive admin startup bypasses the normal subscription cache', async () => {
  const [service, admin] = await Promise.all([
    source('src/services/subscription.js'),
    source('src/routes/admin.js')
  ]);
  assert.match(service, /const recoverySync = subscriptionNeedsRecoverySync\(shop, \{ now \}\)/);
  assert.match(service, /!force && !recoverySync && lastSynced/);
  assert.match(service, /partner_api_recovery/);
  assert.match(admin, /const recoveryNeeded = config\.subscription\.enabled && subscriptionNeedsRecoverySync\(req\.shop\)/);
  assert.match(admin, /admin_force_recovery_sync/);
  assert.match(admin, /subscriptionRecovery/);
  assert.match(admin, /recovered: previousMode !== 'full' && subscription\.adminMode === 'full'/);
});

test('v0.7.0.3 reconciles activation, payment, and expiration webhooks with Partner API', async () => {
  const webhook = await source('src/routes/shopline-webhooks.js');
  assert.match(webhook, /webhook_create_sync/);
  assert.match(webhook, /webhook_payment_sync/);
  assert.match(webhook, /webhook_expiration_sync/);
  assert.match(webhook, /Could not refresh subscription after activation webhook/);
});

test('v0.7.0.3 admin automatically recovers a resumed archived session without continuous polling', async () => {
  const client = await source('public/admin/app.js');
  assert.match(client, /async function recoverSubscriptionIfNeeded/);
  assert.match(client, /window\.addEventListener\('focus'/);
  assert.match(client, /window\.addEventListener\('pageshow'/);
  assert.match(client, /document\.addEventListener\('visibilitychange'/);
  assert.match(client, /\/subscription\?refresh=1/);
  assert.match(client, /SHOPLINE subscription restored\. Full access is available again\./);
  assert.match(client, /loadBootstrap\(\{ suppressRecoveryToast: true \}\)/);
  assert.doesNotMatch(client, /setInterval\([^\n]*recoverSubscriptionIfNeeded/);
});

test('v0.7.0.3 documents the SHOPLINE upstream package-gate limitation', async () => {
  const notes = await source('docs/V0703_SUBSCRIPTION_RECOVERY_HARDENING.md');
  assert.match(notes, /cannot be overridden by Appointment Lite code/);
  assert.match(notes, /does not bypass SHOPLINE's platform-level paid-package gate/);
});
