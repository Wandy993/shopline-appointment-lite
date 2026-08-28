import crypto from 'node:crypto';
import { config } from '../config.js';
import { OpsHubEvent } from '../models/OpsHubEvent.js';
import { OpsUsageDaily } from '../models/OpsUsageDaily.js';
import { Shop } from '../models/Shop.js';

export const SUPPORTED_OPS_EVENT_TYPES = Object.freeze([
  'app.heartbeat',
  'shop.installed',
  'shop.uninstalled',
  'shop.active',
  'usage.daily',
  'health.event'
]);

export const OPS_USAGE_KEYS = Object.freeze([
  'app_api_admin_requests',
  'app_api_availability_requests',
  'app_api_booking_requests',
  'business_bookings_created',
  'business_bookings_cancelled',
  'business_bookings_rescheduled',
  'shopline_api_requests',
  'shopline_api_failures',
  'webhook_received',
  'webhook_failures',
  'external_calendar_syncs',
  'external_calendar_failures',
  'external_emails_sent',
  'external_email_failures',
  'health_warnings',
  'health_errors',
  'health_slow_availability_requests'
]);

const SUPPORTED_EVENT_SET = new Set(SUPPORTED_OPS_EVENT_TYPES);
const USAGE_KEY_SET = new Set(OPS_USAGE_KEYS);
const SAFE_METADATA_KEYS = new Set([
  'reason', 'category', 'severity', 'errorCode', 'statusCode', 'durationMs',
  'ruleId', 'bookingId', 'orderId', 'endpoint', 'method', 'topic', 'audience',
  'operation', 'attempts', 'storeStatus', 'reinstall', 'source', 'date',
  'count', 'providerStatus'
]);
const SENSITIVE_KEY = /(email|phone|address|name|token|secret|password|cookie|authorization|body|payload|customer|note|messagebody|refresh)/i;
const MAX_COUNTER = 1_000_000_000;
const MAX_OUTBOX_ATTEMPTS = 12;
const APP_START_AT = Date.now();

function expiresInDays(days) {
  return new Date(Date.now() + Math.max(1, Number(days || 1)) * 24 * 60 * 60 * 1000);
}

function usageDate(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function previousUsageDate(date = new Date()) {
  const point = new Date(date);
  point.setUTCDate(point.getUTCDate() - 1);
  return usageDate(point);
}

function compactString(value, max = 500) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

export function opsHubConfigured(runtimeConfig = config.opsHub) {
  return Boolean(runtimeConfig?.enabled && runtimeConfig?.ingestUrl && runtimeConfig?.appKey && runtimeConfig?.ingestSecret);
}

export function opsHubSignature(rawBody, timestamp, secret) {
  return crypto.createHmac('sha256', String(secret || ''))
    .update(`${String(timestamp)}.${String(rawBody || '')}`)
    .digest('hex');
}

export function buildOpsHubHeaders(rawBody, timestamp = Date.now(), runtimeConfig = config.opsHub) {
  const time = String(timestamp);
  return {
    'Content-Type': 'application/json',
    'X-Ops-App-Key': String(runtimeConfig.appKey || ''),
    'X-Ops-Timestamp': time,
    'X-Ops-Signature': `sha256=${opsHubSignature(rawBody, time, runtimeConfig.ingestSecret)}`
  };
}

export function normalizeOpsCounter(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(MAX_COUNTER, Math.round(number));
}

export function normalizeUsageCounters(value = {}) {
  const source = value instanceof Map ? Object.fromEntries(value.entries()) : (value || {});
  const normalized = {};
  for (const key of OPS_USAGE_KEYS) {
    const count = normalizeOpsCounter(source[key]);
    if (count) normalized[key] = count;
  }
  return normalized;
}

export function sanitizeOpsMetadata(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const safe = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = String(rawKey || '');
    if (!SAFE_METADATA_KEYS.has(key) || SENSITIVE_KEY.test(key)) continue;
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) safe[key] = Math.max(-MAX_COUNTER, Math.min(MAX_COUNTER, rawValue));
      continue;
    }
    if (typeof rawValue === 'boolean') {
      safe[key] = rawValue;
      continue;
    }
    safe[key] = compactString(rawValue, 300);
  }
  return safe;
}

export function opsStoreIdentity(shop = {}) {
  const handle = compactString(shop.handle || shop.shopHandle, 80).toLowerCase();
  const suppliedDomain = compactString(shop.shopDomain, 180).toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  // Ops Hub store identity must be stable even when a merchant changes its custom
  // storefront domain. Prefer the SHOPLINE handle hostname over primaryDomain.
  const shopDomain = handle ? `${handle}.myshopline.com` : suppliedDomain;
  return {
    shopId: compactString(shop.shoplineStoreId || shop.storeId || shop.shopId || '', 100),
    shopHandle: handle,
    shopDomain
  };
}

function commonPayloadFields({ occurredAt = new Date().toISOString(), shop, appVersion, environment } = {}) {
  const identity = opsStoreIdentity(shop || {});
  return {
    occurredAt: new Date(occurredAt).toISOString(),
    appVersion: compactString(appVersion || config.opsHub.appVersion || '0.6.16', 40),
    environment: compactString(environment || config.opsHub.environment || config.nodeEnv || 'development', 40),
    ...(identity.shopId ? { shopId: identity.shopId } : {}),
    ...(identity.shopHandle ? { shopHandle: identity.shopHandle } : {}),
    ...(identity.shopDomain ? { shopDomain: identity.shopDomain } : {})
  };
}

export function normalizeOpsHubPayload(payload = {}) {
  const eventType = compactString(payload.eventType, 80);
  if (!SUPPORTED_EVENT_SET.has(eventType)) throw new Error(`Unsupported Ops Hub event type: ${eventType || 'missing'}`);
  const normalized = {
    eventType,
    occurredAt: new Date(payload.occurredAt || Date.now()).toISOString(),
    appVersion: compactString(payload.appVersion || config.opsHub.appVersion || '0.6.16', 40),
    environment: compactString(payload.environment || config.opsHub.environment || config.nodeEnv || 'development', 40)
  };
  for (const key of ['shopId', 'shopHandle', 'shopDomain']) {
    const value = compactString(payload[key], key === 'shopDomain' ? 180 : 100);
    if (value) normalized[key] = value;
  }
  if (eventType === 'usage.daily') {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || '')) ? String(payload.date) : usageDate(payload.occurredAt || new Date());
    normalized.date = date;
    normalized.counters = normalizeUsageCounters(payload.counters || {});
  } else if (eventType === 'health.event') {
    const message = compactString(payload.message || payload.metadata?.reason || 'Appointment Lite health event', 500);
    if (message) normalized.message = message;
    normalized.metadata = sanitizeOpsMetadata(payload.metadata || {});
  } else if (payload.metadata && typeof payload.metadata === 'object') {
    const metadata = sanitizeOpsMetadata(payload.metadata);
    if (Object.keys(metadata).length) normalized.metadata = metadata;
  }
  return normalized;
}

export function opsHubRetryDelayMs(attempt = 1, random = Math.random) {
  const steps = [5_000, 15_000, 60_000, 300_000, 900_000, 3_600_000];
  const base = steps[Math.min(steps.length - 1, Math.max(0, Number(attempt || 1) - 1))];
  const jitter = Math.round(Math.max(0, Math.min(1, Number(random()))) * Math.min(5000, Math.round(base * 0.2)));
  return Math.max(5_000, base + jitter);
}

export function opsHealthDedupeKey(reason, shop = {}, metadata = {}) {
  const identity = opsStoreIdentity(shop);
  const material = [identity.shopDomain, compactString(reason, 100), compactString(metadata.errorCode, 80), compactString(metadata.statusCode, 20)].join('|');
  return crypto.createHash('sha256').update(material).digest('hex').slice(0, 40);
}

export async function sendOpsHubPayload(payload, {
  runtimeConfig = config.opsHub,
  fetchImpl = fetch,
  now = Date.now
} = {}) {
  if (!opsHubConfigured(runtimeConfig)) return { skipped: true, reason: 'OPS_HUB_DISABLED' };
  const normalized = normalizeOpsHubPayload(payload);
  const rawBody = JSON.stringify(normalized);
  const timestamp = String(now());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('OPS_HUB_TIMEOUT')), Number(runtimeConfig.timeoutMs || 15000));
  timeout.unref?.();
  try {
    const response = await fetchImpl(runtimeConfig.ingestUrl, {
      method: 'POST',
      headers: buildOpsHubHeaders(rawBody, timestamp, runtimeConfig),
      body: rawBody,
      signal: controller.signal
    });
    const text = await response.text().catch(() => '');
    let responsePayload = null;
    try { responsePayload = text ? JSON.parse(text) : null; } catch { responsePayload = text.slice(0, 500); }
    if (!response.ok) {
      const detail = typeof responsePayload === 'string'
        ? responsePayload
        : (responsePayload?.message || responsePayload?.error || JSON.stringify(responsePayload || {}));
      throw Object.assign(new Error(`Ops Hub ingest rejected with HTTP ${response.status}: ${compactString(detail, 500)}`), {
        code: 'OPS_HUB_HTTP_ERROR', status: response.status, response: responsePayload, eventType: normalized.eventType
      });
    }
    return { ok: true, status: response.status, payload: responsePayload, eventType: normalized.eventType };
  } catch (error) {
    if (error?.name === 'AbortError' || String(error?.message || '').includes('OPS_HUB_TIMEOUT')) {
      throw Object.assign(new Error('OPS_HUB_TIMEOUT'), { code: 'OPS_HUB_TIMEOUT', status: 0, eventType: normalized.eventType });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveShop(shopOrId) {
  if (!shopOrId) return null;
  if (typeof shopOrId === 'object' && shopOrId._id) return shopOrId;
  try { return await Shop.findById(shopOrId).lean(); } catch { return null; }
}

export async function queueOpsEvent(eventType, {
  shop = null,
  occurredAt = new Date(),
  message = '',
  metadata = {},
  date = '',
  counters = {},
  dedupeKey = '',
  sourceUsageId = null
} = {}) {
  if (!opsHubConfigured()) return null;
  try {
    const resolvedShop = await resolveShop(shop);
    const common = commonPayloadFields({ occurredAt, shop: resolvedShop || shop || {} });
    const payload = normalizeOpsHubPayload({
      eventType,
      ...common,
      ...(message ? { message } : {}),
      ...(metadata ? { metadata } : {}),
      ...(eventType === 'usage.daily' ? { date, counters } : {})
    });
    const identity = opsStoreIdentity(resolvedShop || shop || {});
    return await OpsHubEvent.create({
      eventType,
      shopId: resolvedShop?._id || (typeof shop === 'object' ? shop?._id : shop) || undefined,
      shopHandle: identity.shopHandle,
      payload,
      dedupeKey: compactString(dedupeKey, 220),
      sourceUsageId: sourceUsageId || undefined,
      expiresAt: expiresInDays(config.opsHub.eventRetentionDays)
    });
  } catch (error) {
    console.warn('Ops Hub event queue failed', { eventType, message: error.message });
    return null;
  }
}

export async function incrementOpsUsage(shop, key, amount = 1) {
  if (!opsHubConfigured() || !USAGE_KEY_SET.has(String(key))) return false;
  const count = normalizeOpsCounter(amount);
  if (!count) return false;
  try {
    const resolvedShop = await resolveShop(shop);
    if (!resolvedShop?._id) return false;
    const date = usageDate();
    const identity = opsStoreIdentity(resolvedShop);
    await OpsUsageDaily.updateOne(
      { date, shopId: resolvedShop._id },
      {
        $setOnInsert: {
          date,
          shopId: resolvedShop._id,
          shopHandle: identity.shopHandle,
          expiresAt: expiresInDays(config.opsHub.usageRetentionDays)
        },
        $inc: { [`counters.${key}`]: count }
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.warn('Ops Hub usage increment failed', { key, message: error.message });
    return false;
  }
}

export async function queueHealthEvent(reason, {
  shop = null,
  severity = 'error',
  category = 'runtime',
  message = '',
  metadata = {}
} = {}) {
  if (!opsHubConfigured()) return null;
  try {
    const resolvedShop = await resolveShop(shop);
    const safeMetadata = sanitizeOpsMetadata({ ...metadata, reason, category, severity });
    const dedupeKey = opsHealthDedupeKey(reason, resolvedShop || shop || {}, safeMetadata);
    const since = new Date(Date.now() - config.opsHub.healthDedupeMs);
    const duplicate = await OpsHubEvent.exists({ eventType: 'health.event', dedupeKey, createdAt: { $gte: since }, status: { $ne: 'failed' } });
    if (duplicate) return null;
    if (resolvedShop?._id) {
      void incrementOpsUsage(resolvedShop, severity === 'warning' ? 'health_warnings' : 'health_errors', 1);
    }
    return queueOpsEvent('health.event', {
      shop: resolvedShop || shop,
      message: message || compactString(reason, 300),
      metadata: safeMetadata,
      dedupeKey
    });
  } catch (error) {
    console.warn('Ops Hub health event queue failed', { reason, message: error.message });
    return null;
  }
}

export function queueShopInstalled(shop, { reinstall = false, ...metadata } = {}) {
  return queueOpsEvent('shop.installed', { shop, metadata: { reinstall, ...metadata } });
}

export function queueShopUninstalled(shop, metadata = {}) {
  return queueOpsEvent('shop.uninstalled', { shop, metadata });
}

export async function queueShopActive(shop) {
  if (!opsHubConfigured() || !shop?._id) return null;
  try {
    const threshold = new Date(Date.now() - config.opsHub.activeThrottleMs);
    const updated = await Shop.findOneAndUpdate(
      { _id: shop._id, $or: [{ opsHubLastActiveAt: { $exists: false } }, { opsHubLastActiveAt: null }, { opsHubLastActiveAt: { $lt: threshold } }] },
      { $set: { opsHubLastActiveAt: new Date() } },
      { new: true }
    ).lean();
    if (!updated) return null;
    return queueOpsEvent('shop.active', { shop: updated });
  } catch (error) {
    console.warn('Ops Hub active event queue failed', { message: error.message });
    return null;
  }
}

export function queueHeartbeat() {
  return queueOpsEvent('app.heartbeat', {
    metadata: {
      operation: 'heartbeat',
      durationMs: Date.now() - APP_START_AT
    }
  });
}

export async function queueDailyUsageSnapshots({ date = previousUsageDate() } = {}) {
  if (!opsHubConfigured()) return { queued: 0, date };
  const rows = await OpsUsageDaily.find({ date, queuedAt: null }).limit(500).lean();
  let queued = 0;
  for (const row of rows) {
    const counters = normalizeUsageCounters(row.counters || {});
    if (!Object.keys(counters).length) {
      await OpsUsageDaily.updateOne({ _id: row._id, queuedAt: null }, { $set: { queuedAt: new Date() } });
      continue;
    }
    const shop = await Shop.findById(row.shopId).lean();
    if (!shop) continue;
    const event = await queueOpsEvent('usage.daily', {
      shop,
      date: row.date,
      counters,
      dedupeKey: `usage:${row.date}:${String(row.shopId)}`,
      sourceUsageId: row._id
    });
    if (event) {
      const result = await OpsUsageDaily.updateOne({ _id: row._id, queuedAt: null }, { $set: { queuedAt: new Date() } });
      if (result.modifiedCount) queued += 1;
    }
  }
  return { queued, date };
}

export async function requeueRecoverableOutboxEvents({ staleMs = 5 * 60_000 } = {}) {
  if (!opsHubConfigured()) return { modified: 0 };
  const stale = new Date(Date.now() - staleMs);
  const result = await OpsHubEvent.updateMany(
    { status: 'sending', lockedAt: { $lt: stale }, attempts: { $lt: MAX_OUTBOX_ATTEMPTS } },
    { $set: { status: 'failed', nextAttemptAt: new Date(), lastError: 'Recovered stale sending lock.' }, $unset: { lockedAt: 1 } }
  );
  return { modified: result.modifiedCount || 0 };
}

async function claimNextOutboxEvent() {
  return OpsHubEvent.findOneAndUpdate(
    {
      status: { $in: ['pending', 'failed'] },
      nextAttemptAt: { $lte: new Date() },
      attempts: { $lt: MAX_OUTBOX_ATTEMPTS }
    },
    { $set: { status: 'sending', lockedAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { nextAttemptAt: 1, createdAt: 1 }, new: true }
  );
}

function retryableOpsFailure(status) {
  return !status || status === 408 || status === 429 || status >= 500;
}

export async function flushOpsHubOutbox({ limit = config.opsHub.batchSize, sender = sendOpsHubPayload } = {}) {
  if (!opsHubConfigured()) return { sent: 0, failed: 0, skipped: true };
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < Math.max(1, Number(limit || 1)); index += 1) {
    const event = await claimNextOutboxEvent();
    if (!event) break;
    try {
      // Normalize persisted payloads again at send time so old or malformed fields
      // can never poison a later batch after the Hub contract becomes stricter.
      const normalized = normalizeOpsHubPayload(event.payload || {});
      const result = await sender(normalized);
      if (result?.skipped) {
        await OpsHubEvent.updateOne({ _id: event._id }, { $set: { status: 'failed', nextAttemptAt: new Date(Date.now() + 60_000), lastError: result.reason || 'OPS_HUB_DISABLED' }, $unset: { lockedAt: 1 } });
        failed += 1;
        continue;
      }
      await OpsHubEvent.updateOne({ _id: event._id }, { $set: { status: 'sent', sentAt: new Date(), lastError: '', lastStatusCode: Number(result?.status || 200) }, $unset: { lockedAt: 1 } });
      sent += 1;
    } catch (error) {
      const status = Number(error?.status || 0);
      const retryAfter = retryableOpsFailure(status) ? opsHubRetryDelayMs(event.attempts) : 60 * 60_000;
      await OpsHubEvent.updateOne({ _id: event._id }, { $set: {
        status: 'failed',
        nextAttemptAt: new Date(Date.now() + retryAfter),
        lastError: compactString(error?.message || 'Ops Hub delivery failed.', 1000),
        lastStatusCode: status
      }, $unset: { lockedAt: 1 } });
      console.warn('Ops Hub delivery failed', { eventType: event.eventType, statusCode: status, attempt: event.attempts, message: compactString(error?.message, 500) });
      failed += 1;
    }
  }
  return { sent, failed, skipped: false };
}
