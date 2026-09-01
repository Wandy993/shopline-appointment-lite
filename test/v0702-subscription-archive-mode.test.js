import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { subscriptionAdminMode, subscriptionAccessState } from '../src/services/subscription.js';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v0.8.0.2 keeps active and grace-period subscriptions in full mode', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');
  assert.equal(subscriptionAdminMode({ status: 'active', expiresAt: new Date('2026-08-29T12:00:00.000Z') }, { enabled: true, now }), 'full');
  assert.equal(subscriptionAdminMode({ status: 'expired', expiresAt: new Date('2026-08-28T00:00:00.000Z'), everActivatedAt: new Date('2026-08-20T00:00:00.000Z') }, { enabled: true, now }), 'full');
  assert.equal(subscriptionAccessState({ status: 'expired', expiresAt: new Date('2026-08-28T00:00:00.000Z') }, { enabled: true, now }).reason, 'GRACE_PERIOD');
});

test('v0.8.0.2 moves previously activated stores into archive mode after grace ends', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');
  const ended = {
    status: 'expired',
    startedAt: new Date('2026-07-20T00:00:00.000Z'),
    expiresAt: new Date('2026-08-26T00:00:00.000Z'),
    everActivatedAt: new Date('2026-07-20T00:00:00.000Z')
  };
  assert.equal(subscriptionAdminMode(ended, { enabled: true, now }), 'archive');
  assert.equal(subscriptionAdminMode({ status: 'none', everActivatedAt: new Date('2026-07-20T00:00:00.000Z') }, { enabled: true, now }), 'archive');
  assert.equal(subscriptionAdminMode({ status: 'cancelled', startedAt: new Date('2026-07-20T00:00:00.000Z') }, { enabled: true, now }), 'archive');
});

test('v0.8.0.2 still gates stores that never had an active subscription', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');
  assert.equal(subscriptionAdminMode({ status: 'none' }, { enabled: true, now }), 'subscription_required');
  assert.equal(subscriptionAdminMode({ status: 'pending' }, { enabled: true, now }), 'subscription_required');
});

test('v0.8.0.2 server only exposes booking reads during archive mode', async () => {
  const [middleware, admin, service] = await Promise.all([
    source('src/middleware/subscription.js'),
    source('src/routes/admin.js'),
    source('src/services/subscription.js')
  ]);
  assert.match(middleware, /adminMode === 'archive' && req\.method === 'GET' && req\.path === '\/bookings'/);
  assert.match(middleware, /SUBSCRIPTION_ARCHIVE_READ_ONLY/);
  assert.match(admin, /accessMode: 'archive'/);
  assert.match(admin, /adminRouter\.use\(requireAdminSubscriptionAccess\)/);
  assert.match(service, /admin\/app-store\/package/);
  assert.match(service, /SHOPLINE_SUBSCRIPTION_PACKAGE_ID|packageId/);
});

test('v0.8.0.2 admin archive UI keeps booking export and billing renewal while removing booking actions', async () => {
  const [view, client, css] = await Promise.all([
    source('src/views/admin.js'),
    source('public/admin/app.js'),
    source('public/admin/styles.css')
  ]);
  assert.match(view, /id="bookingArchiveNotice"/);
  assert.match(view, /id="renewSubscriptionBilling"/);
  assert.match(view, /id="exportBookings"/);
  assert.match(client, /state\.archiveMode/);
  assert.match(client, /readonly-badge/);
  assert.match(client, /openShoplineRenewal/);
  assert.match(client, /if \(state\.archiveMode\) view = 'list'/);
  assert.match(client, /if \(state\.archiveMode\) loadBookings\(\)/);
  assert.match(css, /body\.subscription-archive/);
  assert.match(css, /archive-mode-banner/);
});


test('v0.8.0.2 suppresses runtime booking operations while the subscription is inactive', async () => {
  const [webhooks, reminders, paid, postPurchase] = await Promise.all([
    source('src/routes/shopline-webhooks.js'),
    source('src/services/reminders.js'),
    source('src/services/paid-bookings.js'),
    source('src/services/post-purchase.js')
  ]);
  assert.match(webhooks, /businessTopic && opsShop && !subscriptionAccessAllowed\(opsShop\)/);
  assert.match(webhooks, /reason: 'SUBSCRIPTION_INACTIVE'/);
  assert.match(reminders, /subscriptionAccessAllowed\(shop\)/);
  assert.match(paid, /reason: 'SUBSCRIPTION_INACTIVE'/);
  assert.match(postPurchase, /reason: 'SUBSCRIPTION_INACTIVE'/);
});
