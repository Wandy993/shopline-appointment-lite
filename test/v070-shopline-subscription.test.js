import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pickCurrentSubscription, publicSubscriptionSnapshot, shoplineSubscriptionPlanUrl, shoplineTimestampToDate, subscriptionAccessState } from '../src/services/subscription.js';
import { config } from '../src/config.js';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v0.8.0 normalizes SHOPLINE second and millisecond subscription timestamps', () => {
  const seconds = shoplineTimestampToDate(1_788_000_000);
  const millis = shoplineTimestampToDate(1_788_000_000_000);
  assert.equal(seconds.getTime(), 1_788_000_000_000);
  assert.equal(millis.getTime(), 1_788_000_000_000);
});

test('v0.8.0 chooses the current target plan instead of a future preorder', () => {
  const now = new Date('2026-08-28T00:00:00.000Z');
  const current = pickCurrentSubscription({ subscriptions: { data: [
    { spu_key: 'appointment_lite_pro', sub_id: 'next', sub_status: 'active', sub_type: 'preorder', start_at: new Date('2026-09-28T00:00:00Z').getTime(), end_at: new Date('2026-10-28T00:00:00Z').getTime() },
    { spu_key: 'appointment_lite_pro', sub_id: 'current', sub_status: 'active', sub_type: 'trial', is_trial: true, start_at: new Date('2026-08-27T00:00:00Z').getTime(), end_at: new Date('2026-09-03T00:00:00Z').getTime() },
    { spu_key: 'another_plan', sub_id: 'other', sub_status: 'active', sub_type: 'paid' }
  ] } }, { spuKey: 'appointment_lite_pro', now });
  assert.equal(current.subId, 'current');
  assert.equal(current.isTrial, true);
  assert.equal(current.type, 'trial');
});

test('v0.8.0.1 trial day display never exceeds the configured SHOPLINE trial term', () => {
  const now = new Date('2026-08-28T12:54:00.000Z');
  const snapshot = publicSubscriptionSnapshot({
    status: 'active',
    type: 'trial',
    isTrial: true,
    startedAt: new Date('2026-08-28T12:54:00.000Z'),
    // SHOPLINE may round end_at to a billing boundary, making the duration a few minutes over 7 days.
    expiresAt: new Date('2026-09-04T13:00:00.000Z')
  }, { now });
  assert.equal(config.subscription.trialDays, 7);
  assert.equal(snapshot.trialDaysRemaining, 7);
});

test('v0.8.0 access follows SHOPLINE active state and the documented one-day grace period', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');
  assert.equal(subscriptionAccessState({ status: 'active', expiresAt: new Date('2026-08-29T00:00:00Z') }, { enabled: true, now }).allowed, true);
  assert.equal(subscriptionAccessState({ status: 'expired', expiresAt: new Date('2026-08-28T00:00:00Z') }, { enabled: true, now }).reason, 'GRACE_PERIOD');
  assert.equal(subscriptionAccessState({ status: 'expired', expiresAt: new Date('2026-08-26T00:00:00Z') }, { enabled: true, now }).allowed, false);
  assert.equal(subscriptionAccessState({ status: 'cancelled' }, { enabled: true, now }).allowed, false);
});

test('v0.8.0.7 opens SHOPLINE subscription activation in a separate window', async () => {
  const url = shoplineSubscriptionPlanUrl({ handle: 'AppTest' });
  assert.equal(url, 'https://apptest.myshopline.com/admin/app-store/package/c0ced1537654a66c337cd3af4b820b7eac9dd33c');
  const client = await source('public/admin/app.js');
  const start = client.indexOf('async function startSubscriptionCheckout()');
  const end = client.indexOf('function openShoplineRenewal()', start);
  const section = client.slice(start, end);
  assert.match(section, /state\.subscription\?\.shoplinePlanUrl/);
  assert.match(section, /window\.open\(packageUrl, '_blank', 'noopener,noreferrer'\)/);
  assert.match(section, /button\.disabled = false/);
  assert.match(section, /browser blocked the SHOPLINE subscription window/);
  assert.doesNotMatch(section, /subscription\/checkout/);
  assert.match(section, /SHOPLINE subscription package URL is not configured/);
});

test('v0.8.0 Partner Token stays server-side and subscription API routes are wired', async () => {
  const [service, env, admin, publicRoute, bookings, app] = await Promise.all([
    source('src/services/subscription.js'), source('.env.example'), source('src/routes/admin.js'), source('src/routes/public.js'), source('src/services/bookings.js'), source('src/app.js')
  ]);
  assert.match(env, /SHOPLINE_PARTNER_TOKEN=/);
  assert.match(env, /SHOPLINE_SUBSCRIPTION_ENABLED=false/);
  assert.match(env, /SHOPLINE_SUBSCRIPTION_PRICE_USD=5\.99/);
  assert.match(env, /SHOPLINE_SUBSCRIPTION_TRIAL_DAYS=7/);
  assert.match(service, /X-Shopline-Access-Token/);
  assert.doesNotMatch(service, /partnerSubscriptionRequest\('create_pay\.json'/);
  assert.match(service, /shopline_package/);
  assert.doesNotMatch(admin, /checkout_preflight/);
  assert.match(service, /list\.json/);
  assert.match(admin, /\/subscription\/checkout/);
  assert.match(admin, /adminRouter\.use\(requireAdminSubscriptionAccess\)/);
  assert.match(publicRoute, /publicSubscriptionUnavailable/);
  assert.match(bookings, /subscriptionAccessAllowed/);
  assert.match(app, /\/subscription/);
  assert.match(app, /release: 'v0\.8\.0-core-booking-staff'/);
  assert.match(app, /Cache-Control', 'no-store/);
  const [adminClient, themeClient] = await Promise.all([source('public/admin/app.js'), source('theme-extension-source/public/appointment-lite.js')]);
  assert.doesNotMatch(adminClient, /SHOPLINE_PARTNER_TOKEN/);
  assert.doesNotMatch(themeClient, /SHOPLINE_PARTNER_TOKEN/);
});

test('v0.8.0 subscription webhooks use the existing signed SHOPLINE webhook pipeline', async () => {
  const webhook = await source('src/routes/shopline-webhooks.js');
  assert.match(webhook, /appsubscription\/create/);
  assert.match(webhook, /appsubscription\/expiration/);
  assert.match(webhook, /appsubscription\/paid/);
  assert.match(webhook, /verifyShoplineWebhookSignature/);
  assert.match(webhook, /WebhookReceipt/);
});

test('v0.8.0 admin exposes a single Pro plan at USD 5.99 per month with SHOPLINE-managed seven-day trial', async () => {
  const [view, client, css] = await Promise.all([source('src/views/admin.js'), source('public/admin/app.js'), source('public/admin/styles.css')]);
  assert.match(view, /Appointment Lite Pro/);
  assert.match(view, /\$5\.99/);
  assert.match(view, /7-day free trial/);
  assert.match(view, /Continue with SHOPLINE/);
  assert.match(view, /Plan & billing/);
  assert.match(client, /startSubscriptionCheckout/);
  assert.match(client, /subscription_return=1/);
  assert.match(css, /subscription-gate-card/);
  assert.match(css, /billing-grid/);
});
