import crypto from 'node:crypto';
import { config } from '../config.js';
import { Shop } from '../models/Shop.js';
import { SubscriptionCheckout } from '../models/SubscriptionCheckout.js';
import { incrementOpsUsage, queueHealthEvent } from './ops-hub.js';

const ACCESS_STATUSES = new Set(['active', 'expired']);
const INACTIVE_STATUSES = new Set(['none', 'pending', 'unactive', 'cancelled', 'locked']);

function asString(value) {
  return String(value ?? '').trim();
}

function asBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = asString(value).toLowerCase();
  return ['1', 'true', 'yes', 'y'].includes(normalized);
}

export function shoplineTimestampToDate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const millis = numeric < 1e12 ? numeric * 1000 : numeric;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStatus(value) {
  const normalized = asString(value).toLowerCase();
  if (['active', 'pending', 'expired', 'unactive', 'cancelled', 'locked'].includes(normalized)) return normalized;
  return normalized || 'none';
}

function normalizeType(value, isTrial = false) {
  const normalized = asString(value).toLowerCase();
  if (['trial', 'paid', 'preorder'].includes(normalized)) return normalized;
  return isTrial ? 'trial' : (normalized || '');
}

function subscriptionRows(payload = {}) {
  const roots = [
    payload?.subscriptions?.data,
    payload?.subscriptions?.items,
    payload?.data?.subscriptions?.data,
    payload?.data?.subscriptions?.items,
    payload?.data?.subscriptions,
    payload?.subscriptions,
    payload?.data,
    payload
  ];
  for (const root of roots) {
    if (Array.isArray(root)) return root;
  }
  return [];
}

export function normalizeShoplineSubscription(row = {}) {
  const isTrial = asBoolean(row.is_trial ?? row.isTrial ?? row.trial);
  return {
    subId: asString(row.sub_id ?? row.subId),
    spuKey: asString(row.spu_key ?? row.spuKey),
    status: normalizeStatus(row.sub_status ?? row.subStatus ?? row.status),
    type: normalizeType(row.sub_type ?? row.subType, isTrial),
    isTrial,
    autoRecurring: asBoolean(row.auto_recurring ?? row.autoRecurring ?? row.autoRenewStatus),
    startedAt: shoplineTimestampToDate(row.start_at ?? row.startAt),
    expiresAt: shoplineTimestampToDate(row.end_at ?? row.endAt),
    raw: row
  };
}

function scoreSubscription(item, nowMs = Date.now()) {
  const start = item.startedAt?.getTime?.() || 0;
  const end = item.expiresAt?.getTime?.() || Number.MAX_SAFE_INTEGER;
  if (item.type === 'preorder' && start > nowMs) return 10;
  if (item.status === 'active' && start <= nowMs && end + config.subscription.gracePeriodMs >= nowMs) return item.isTrial ? 90 : 100;
  if (item.status === 'expired' && end + config.subscription.gracePeriodMs >= nowMs) return 80;
  if (item.status === 'pending') return 40;
  if (item.status === 'active') return 35;
  return 20;
}

export function pickCurrentSubscription(payload, { spuKey = config.subscription.spuKey, now = new Date() } = {}) {
  const rows = subscriptionRows(payload)
    .map(normalizeShoplineSubscription)
    .filter(item => !spuKey || item.spuKey === spuKey);
  if (!rows.length) return null;
  return rows.sort((a, b) => {
    const score = scoreSubscription(b, now.getTime()) - scoreSubscription(a, now.getTime());
    if (score) return score;
    return (b.startedAt?.getTime?.() || 0) - (a.startedAt?.getTime?.() || 0);
  })[0];
}

export function subscriptionAccessState(subscription = {}, { now = new Date(), enabled = config.subscription.enabled } = {}) {
  if (!enabled) return { allowed: true, reason: 'SUBSCRIPTION_DISABLED' };
  const status = normalizeStatus(subscription?.status);
  if (INACTIVE_STATUSES.has(status)) return { allowed: false, reason: `STATUS_${status.toUpperCase()}` };
  if (!ACCESS_STATUSES.has(status)) return { allowed: false, reason: 'STATUS_UNKNOWN' };

  const expiresAt = subscription?.expiresAt ? new Date(subscription.expiresAt) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
    const accessUntil = expiresAt.getTime() + config.subscription.gracePeriodMs;
    if (now.getTime() > accessUntil) return { allowed: false, reason: 'SUBSCRIPTION_ENDED' };
  }
  return { allowed: true, reason: status === 'expired' ? 'GRACE_PERIOD' : 'ACTIVE' };
}

export function subscriptionAccessAllowed(shopOrSubscription, options = {}) {
  const subscription = shopOrSubscription?.subscription || shopOrSubscription || {};
  return subscriptionAccessState(subscription, options).allowed;
}

export function subscriptionHasHistoricalAccess(shopOrSubscription) {
  const subscription = shopOrSubscription?.subscription || shopOrSubscription || {};
  const status = normalizeStatus(subscription?.status);
  if (subscription?.everActivatedAt) return true;
  if (subscription?.startedAt && ['expired', 'unactive', 'cancelled', 'locked'].includes(status)) return true;
  return false;
}

export function subscriptionAdminMode(shopOrSubscription, { now = new Date(), enabled = config.subscription.enabled } = {}) {
  const subscription = shopOrSubscription?.subscription || shopOrSubscription || {};
  const access = subscriptionAccessState(subscription, { now, enabled });
  if (!enabled || access.allowed) return 'full';
  if (subscriptionHasHistoricalAccess(subscription)) return 'archive';
  return 'subscription_required';
}

export function shoplineSubscriptionPlanUrl(shop = {}) {
  const handle = asString(shop?.handle).toLowerCase();
  const packageId = asString(config.subscription.packageId || config.shopline.appKey);
  if (!handle || !packageId) return '';
  return `https://${encodeURIComponent(handle)}.myshopline.com/admin/app-store/package/${encodeURIComponent(packageId)}`;
}

function remainingTrialDays(subscription, now = new Date()) {
  if (!subscription?.isTrial || !subscription?.expiresAt) return null;
  const end = new Date(subscription.expiresAt).getTime();
  if (!Number.isFinite(end)) return null;

  // SHOPLINE can normalize a trial end timestamp to a billing boundary (for example,
  // the top of an hour). That can make a seven-day trial a few minutes longer than
  // exactly 7 * 24 hours. Using Math.ceil() directly would then display "8 days"
  // even though the configured trial is seven days. Keep SHOPLINE's exact end_at for
  // access control, but cap the merchant-facing day count to the configured trial term.
  const calculatedDays = Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000));
  const configuredDays = Math.max(0, Number(config.subscription.trialDays || 0));
  return configuredDays > 0 ? Math.min(configuredDays, calculatedDays) : calculatedDays;
}

export function publicSubscriptionSnapshot(shopOrSubscription, { now = new Date() } = {}) {
  const shop = shopOrSubscription?.subscription ? shopOrSubscription : null;
  const subscription = shopOrSubscription?.subscription || shopOrSubscription || {};
  const access = subscriptionAccessState(subscription, { now });
  const adminMode = subscriptionAdminMode(subscription, { now });
  return {
    enabled: config.subscription.enabled,
    accessAllowed: access.allowed,
    accessReason: access.reason,
    adminMode,
    archiveMode: adminMode === 'archive',
    shoplinePlanUrl: shoplineSubscriptionPlanUrl(shop || {}),
    planName: config.subscription.planName,
    spuKey: config.subscription.spuKey,
    price: { amount: config.subscription.priceUsd, currency: 'USD', interval: 'month' },
    trialDays: config.subscription.trialDays,
    status: normalizeStatus(subscription.status),
    type: normalizeType(subscription.type, Boolean(subscription.isTrial)),
    isTrial: Boolean(subscription.isTrial),
    autoRecurring: Boolean(subscription.autoRecurring),
    subId: asString(subscription.subId),
    startedAt: subscription.startedAt || null,
    expiresAt: subscription.expiresAt || null,
    everActivatedAt: subscription.everActivatedAt || null,
    trialDaysRemaining: remainingTrialDays(subscription, now),
    lastSyncedAt: subscription.lastSyncedAt || null,
    lastWebhookAt: subscription.lastWebhookAt || null,
    lastPaymentStatus: asString(subscription.lastPaymentStatus),
    lastPaymentAt: subscription.lastPaymentAt || null
  };
}

function partnerApiUrl(pathname, query = {}) {
  const url = new URL(`https://partner.myshopline.com/${config.subscription.partnerApiVersion}/app_subscribe/${pathname}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

function partnerError(payload, status) {
  const message = payload?.message || payload?.msg || payload?.error_description || payload?.error || payload?.errors || 'Unknown Partner API error';
  return Object.assign(new Error(`SHOPLINE subscription API failed (${status}): ${typeof message === 'string' ? message : JSON.stringify(message)}`), {
    code: 'SHOPLINE_SUBSCRIPTION_API_FAILED', status, payload
  });
}

export async function partnerSubscriptionRequest(pathname, { method = 'GET', query = {}, body, fetchImpl = fetch } = {}) {
  if (!config.subscription.partnerToken) {
    throw Object.assign(new Error('SHOPLINE Partner Token is not configured.'), { code: 'SHOPLINE_PARTNER_TOKEN_MISSING', status: 503 });
  }
  const url = partnerApiUrl(pathname, query);
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const options = {
        method,
        headers: {
          'X-Shopline-Access-Token': config.subscription.partnerToken,
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8'
        },
        signal: AbortSignal.timeout(config.subscription.timeoutMs)
      };
      if (body !== undefined) options.body = JSON.stringify(body);
      const response = await fetchImpl(url, options);
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return payload;
      if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
      throw partnerError(payload, response.status);
    } catch (error) {
      lastError = error;
      const retryable = error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.name === 'TypeError';
      if (attempt === 0 && retryable) {
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
      if (error?.code) throw error;
      throw Object.assign(new Error(`SHOPLINE subscription API request failed: ${error.message}`), {
        code: retryable ? 'SHOPLINE_SUBSCRIPTION_API_UNAVAILABLE' : 'SHOPLINE_SUBSCRIPTION_API_FAILED',
        status: 502,
        cause: error
      });
    }
  }
  throw lastError;
}

export async function listSubscriptionProducts({ spuKeys = config.subscription.spuKey, fetchImpl } = {}) {
  return partnerSubscriptionRequest('productList.json', {
    query: { app_key: config.shopline.appKey, ...(spuKeys ? { spu_keys: spuKeys } : {}) },
    ...(fetchImpl ? { fetchImpl } : {})
  });
}

export async function listShopSubscriptions(handle, { fetchImpl } = {}) {
  const query = {
    app_key: config.shopline.appKey,
    handle: asString(handle).toLowerCase(),
    service_type: 1,
    page_num: 1,
    page_size: 50,
    ...(config.subscription.spuKey ? { spu_keys: config.subscription.spuKey } : {})
  };
  return partnerSubscriptionRequest('list.json', { query, ...(fetchImpl ? { fetchImpl } : {}) });
}

function subscriptionUpdateFromCurrent(current, { source = 'partner_api', now = new Date() } = {}) {
  if (!current) {
    return {
      'subscription.spuKey': config.subscription.spuKey,
      'subscription.subId': '',
      'subscription.status': 'none',
      'subscription.type': '',
      'subscription.isTrial': false,
      'subscription.autoRecurring': false,
      'subscription.startedAt': null,
      'subscription.expiresAt': null,
      'subscription.lastSyncedAt': now,
      'subscription.lastSource': source
    };
  }
  return {
    'subscription.spuKey': current.spuKey || config.subscription.spuKey,
    'subscription.subId': current.subId || '',
    'subscription.status': current.status,
    'subscription.type': current.type,
    'subscription.isTrial': current.isTrial,
    'subscription.autoRecurring': current.autoRecurring,
    'subscription.startedAt': current.startedAt,
    'subscription.expiresAt': current.expiresAt,
    'subscription.lastSyncedAt': now,
    'subscription.lastSource': source,
    ...(current.status === 'active' ? { 'subscription.everActivatedAt': now } : {})
  };
}

export async function syncSubscriptionForShop(shopOrId, {
  ShopModel = Shop,
  fetchImpl,
  source = 'partner_api',
  now = new Date()
} = {}) {
  if (!config.subscription.enabled) {
    const shop = typeof shopOrId === 'object' && shopOrId?.handle ? shopOrId : await ShopModel.findById(shopOrId);
    return { shop, subscription: publicSubscriptionSnapshot(shop || {}), synced: false };
  }
  const shop = typeof shopOrId === 'object' && shopOrId?.handle ? shopOrId : await ShopModel.findById(shopOrId);
  if (!shop?.handle) throw Object.assign(new Error('Store not found for subscription sync.'), { code: 'STORE_NOT_FOUND', status: 404 });
  void incrementOpsUsage(shop, 'shopline_partner_api_requests', 1);
  try {
    const payload = await listShopSubscriptions(shop.handle, { ...(fetchImpl ? { fetchImpl } : {}) });
    const current = pickCurrentSubscription(payload, { now });
    const update = subscriptionUpdateFromCurrent(current, { source, now });
    await ShopModel.updateOne({ _id: shop._id }, { $set: update });
    const refreshed = await ShopModel.findById(shop._id);
    return { shop: refreshed || shop, subscription: publicSubscriptionSnapshot(refreshed || { subscription: Object.fromEntries(Object.entries(update).map(([key, value]) => [key.replace('subscription.', ''), value])) }, { now }), synced: true, payload };
  } catch (error) {
    void queueHealthEvent('subscription.sync.failed', {
      shop, severity: 'warning', category: 'subscription',
      message: 'SHOPLINE subscription status sync failed.',
      metadata: { errorCode: String(error?.code || error?.name || 'SUBSCRIPTION_SYNC_FAILED'), operation: 'subscription_sync' }
    });
    throw error;
  }
}

export async function ensureFreshSubscriptionForShop(shop, { maxAgeMs = config.subscription.syncMaxAgeMs, force = false } = {}) {
  if (!config.subscription.enabled) return { shop, subscription: publicSubscriptionSnapshot(shop), synced: false };
  const lastSynced = shop?.subscription?.lastSyncedAt ? new Date(shop.subscription.lastSyncedAt).getTime() : 0;
  if (!force && lastSynced && Date.now() - lastSynced < maxAgeMs) {
    return { shop, subscription: publicSubscriptionSnapshot(shop), synced: false };
  }
  return syncSubscriptionForShop(shop, { source: force ? 'partner_api_force' : 'partner_api' });
}

export function createSubscriptionTradeNo(handle = 'shop') {
  const safeHandle = asString(handle).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 28) || 'shop';
  return `al_${safeHandle}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
}

export function buildSubscriptionCheckoutBody(shop, { outTradeNo, returnUrl } = {}) {
  return {
    application_charge: {
      count: '1',
      out_trade_no: asString(outTradeNo),
      return_url: asString(returnUrl),
      spu_key: config.subscription.spuKey,
      app_key: config.shopline.appKey,
      currency: 'USD',
      handle: asString(shop?.handle).toLowerCase()
    }
  };
}

export async function createSubscriptionCheckout(shop, {
  CheckoutModel = SubscriptionCheckout,
  fetchImpl
} = {}) {
  if (!config.subscription.enabled) throw Object.assign(new Error('SHOPLINE subscription billing is not enabled.'), { code: 'SUBSCRIPTION_DISABLED', status: 503 });
  if (!shop?.handle || !shop?._id) throw Object.assign(new Error('Store session is invalid.'), { code: 'STORE_NOT_FOUND', status: 404 });
  if (subscriptionAccessAllowed(shop)) {
    throw Object.assign(new Error('Appointment Lite Pro is already active for this store.'), { code: 'SUBSCRIPTION_ALREADY_ACTIVE', status: 409 });
  }
  const outTradeNo = createSubscriptionTradeNo(shop.handle);
  const returnUrl = new URL('/subscription/return', config.appUrl);
  returnUrl.searchParams.set('trade', outTradeNo);
  const attempt = await CheckoutModel.create({ shopId: shop._id, outTradeNo, spuKey: config.subscription.spuKey, status: 'created' });
  try {
    void incrementOpsUsage(shop, 'shopline_partner_api_requests', 1);
    const payload = await partnerSubscriptionRequest('create_pay.json', {
      method: 'POST',
      body: buildSubscriptionCheckoutBody(shop, { outTradeNo, returnUrl: returnUrl.toString() }),
      ...(fetchImpl ? { fetchImpl } : {})
    });
    const url = asString(payload?.url ?? payload?.data?.url ?? payload?.application_charge?.url);
    if (!url || !/^https:\/\//i.test(url)) throw Object.assign(new Error('SHOPLINE did not return a subscription checkout URL.'), { code: 'SUBSCRIPTION_CHECKOUT_URL_MISSING', status: 502 });
    await CheckoutModel.updateOne({ _id: attempt._id }, { $set: { status: 'pending', checkoutUrl: url } });
    return { url, outTradeNo };
  } catch (error) {
    await CheckoutModel.updateOne({ _id: attempt._id }, { $set: { status: 'failed', lastError: String(error.message || error).slice(0, 500) } }).catch(() => {});
    void queueHealthEvent('subscription.checkout.failed', {
      shop, severity: 'error', category: 'subscription',
      message: 'SHOPLINE subscription checkout could not be created.',
      metadata: { errorCode: String(error?.code || error?.name || 'SUBSCRIPTION_CHECKOUT_FAILED'), operation: 'subscription_checkout' }
    });
    throw error;
  }
}

export async function querySubscriptionChargeStatus(outTradeNo, { fetchImpl } = {}) {
  return partnerSubscriptionRequest('charges/status.json', {
    query: { app_key: config.shopline.appKey, out_trade_no: asString(outTradeNo) },
    ...(fetchImpl ? { fetchImpl } : {})
  });
}

export async function recordSubscriptionPaymentWebhook(shop, payload = {}, { CheckoutModel = SubscriptionCheckout } = {}) {
  const code = Number(payload.status);
  const outTradeNo = asString(payload.bizOrderNo ?? payload.out_trade_no ?? payload.outTradeNo);
  const subId = asString(payload.subId ?? payload.sub_id);
  const completedAt = shoplineTimestampToDate(payload.subTime ?? payload.sub_time) || new Date();
  const status = code === 200 ? 'paid' : code === 300 ? 'cancelled' : 'failed';
  if (outTradeNo) {
    await CheckoutModel.updateOne({ outTradeNo, shopId: shop._id }, { $set: { status, subId, paymentStatusCode: code, completedAt } }).catch(() => {});
  }
  await Shop.updateOne({ _id: shop._id }, { $set: {
    'subscription.lastPaymentStatus': status,
    'subscription.lastPaymentAt': completedAt,
    'subscription.lastPaymentTradeNo': outTradeNo,
    'subscription.lastWebhookAt': new Date()
  } });
  return { status, outTradeNo, subId };
}

export async function applySubscriptionActivatedWebhook(shop, payload = {}) {
  const packageInfo = payload.subPackage || payload.sub_package || {};
  const isTrial = asBoolean(packageInfo.trial ?? payload.trial);
  const now = new Date();
  await Shop.updateOne({ _id: shop._id }, { $set: {
    'subscription.spuKey': asString(packageInfo.spuKey ?? packageInfo.spu_key ?? payload.spuKey ?? payload.spu_key) || config.subscription.spuKey,
    'subscription.subId': asString(payload.subId ?? payload.sub_id),
    'subscription.status': 'active',
    'subscription.type': isTrial ? 'trial' : 'paid',
    'subscription.isTrial': isTrial,
    'subscription.autoRecurring': asBoolean(packageInfo.autoRenewStatus ?? packageInfo.auto_recurring),
    'subscription.startedAt': shoplineTimestampToDate(packageInfo.startAt ?? packageInfo.start_at),
    'subscription.expiresAt': shoplineTimestampToDate(packageInfo.endAt ?? packageInfo.end_at),
    'subscription.lastWebhookAt': now,
    'subscription.lastSyncedAt': now,
    'subscription.lastSource': 'webhook_create',
    'subscription.everActivatedAt': now
  } });
}

export async function applySubscriptionExpiredWebhook(shop, payload = {}) {
  const expirationType = Number(payload.expirationType ?? payload.expiration_type);
  const packageInfo = payload.subPackage || payload.sub_package || {};
  const now = new Date();
  const baseEnd = shoplineTimestampToDate(packageInfo.endAt ?? packageInfo.end_at ?? payload.expirationTime ?? payload.expiration_time);
  const status = expirationType === 2 ? 'cancelled' : 'expired';
  await Shop.updateOne({ _id: shop._id }, { $set: {
    'subscription.spuKey': asString(payload.spuKey ?? payload.spu_key) || config.subscription.spuKey,
    'subscription.subId': asString(payload.subId ?? payload.sub_id),
    'subscription.status': status,
    'subscription.expiresAt': baseEnd,
    'subscription.expirationType': Number.isFinite(expirationType) ? expirationType : null,
    'subscription.lastWebhookAt': now,
    'subscription.lastSource': 'webhook_expiration'
  } });
}
