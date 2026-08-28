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
  'count', 'providerStatus', 'requestId'
]);
const SENSITIVE_KEY = /(email|phone|address|name|token|secret|password|cookie|authorization|body|payload|customer|note|messagebody|refresh)/i;
const MAX_COUNTER = 1_000_000_000;
const MAX_OUTBOX_ATTEMPTS = 12;

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

function summarizeOpsHubIssue(issue) {
  if (typeof issue === 'string') return compactString(issue, 500);
  if (!issue || typeof issue !== 'object' || Array.isArray(issue)) return '';
  const parts = [];
  if (issue.code) parts.push(`code=${compactString(issue.code, 80)}`);
  if (Array.isArray(issue.path) && issue.path.length) parts.push(`path=${issue.path.map(item => compactString(item, 80)).join('.')}`);
  else if (issue.path) parts.push(`path=${compactString(issue.path, 240)}`);
  if (Array.isArray(issue.keys) && issue.keys.length) parts.push(`keys=${issue.keys.map(item => compactString(item, 80)).join(',')}`);
  if (issue.expected !== undefined) parts.push(`expected=${compactString(issue.expected, 120)}`);
  if (issue.received !== undefined) parts.push(`received=${compactString(issue.received, 120)}`);
  if (issue.message) parts.push(compactString(issue.message, 500));
  return parts.join(' ');
}

export function opsHubResponseDetail(payload) {
  if (typeof payload === 'string') return compactString(payload, 1800);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
  const parts = [];
  const primary = payload.message || payload.error || payload.detail;
  if (primary && typeof primary !== 'object') parts.push(compactString(primary, 500));
  for (const key of ['issues', 'details', 'errors']) {
    const value = payload[key];
    if (!value) continue;
    const items = Array.isArray(value) ? value : [value];
    const summaries = items.map(summarizeOpsHubIssue).filter(Boolean).slice(0, 8);
    if (summaries.length) parts.push(`${key}: ${summaries.join(' | ')}`);
  }
  return compactString(parts.join(' | '), 1800);
}

export function opsHubDiagnosticLine(event, fields = {}) {
  const safe = {
    level: compactString(fields.level || 'warn', 16),
    event: compactString(event || 'ops_hub.event', 100),
    eventType: compactString(fields.eventType || '', 80),
    statusCode: Number(fields.statusCode || 0),
    attempt: Number(fields.attempt || 0),
    code: compactString(fields.code || '', 100),
    message: compactString(fields.message || '', 1000)
  };
  return JSON.stringify(safe);
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
  const handle = compactString(shop.handle || shop.shopHandle, 200).toLowerCase();
  const suppliedDomain = compactString(shop.primaryDomain || shop.shopDomain, 300)
    .toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  // Keep the local identity stable even if a merchant changes a custom domain.
  const shopId = compactString(
    shop.externalStoreId || shop.shoplineStoreId || shop.storeId || shop.shopId || handle || suppliedDomain,
    200
  );
  const shopDomain = handle ? `${handle}.myshopline.com` : suppliedDomain;
  return { shopId, shopHandle: handle, shopDomain };
}

export function opsHubStoreIdentity(shop = {}) {
  const identity = opsStoreIdentity(shop);
  if (!identity.shopId) return null;
  const primaryDomain = compactString(shop.primaryDomain || shop.shopDomain || identity.shopDomain, 300)
    .toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const shopName = compactString(shop.shopName || shop.name || identity.shopHandle, 300);
  return {
    externalStoreId: identity.shopId,
    ...(identity.shopHandle ? { handle: identity.shopHandle } : {}),
    ...(shopName ? { shopName } : {}),
    ...(primaryDomain ? { primaryDomain } : {})
  };
}

function normalizeEventId(value, eventType = 'event') {
  const candidate = compactString(value, 160);
  if (candidate.length >= 8 && /^[A-Za-z0-9._:-]+$/.test(candidate)) return candidate;
  return `appointment-lite:${compactString(eventType, 80) || 'event'}:${crypto.randomUUID()}`;
}

function normalizeHealthStatus(value) {
  const status = compactString(value, 20).toLowerCase();
  if (status === 'error') return 'error';
  if (status === 'warn' || status === 'warning') return 'warn';
  return 'ok';
}

function normalizeHubUsageCounters(value = {}) {
  const source = value || {};
  return {
    appApiCalls: normalizeOpsCounter(source.appApiCalls),
    shoplineApiCalls: normalizeOpsCounter(source.shoplineApiCalls),
    webhookCalls: normalizeOpsCounter(source.webhookCalls),
    errors: normalizeOpsCounter(source.errors)
  };
}

export function usageBucketsToHubCounters(value = {}) {
  const buckets = normalizeUsageCounters(value);
  return {
    appApiCalls: normalizeOpsCounter(
      (buckets.app_api_admin_requests || 0)
      + (buckets.app_api_availability_requests || 0)
      + (buckets.app_api_booking_requests || 0)
    ),
    shoplineApiCalls: normalizeOpsCounter(buckets.shopline_api_requests || 0),
    webhookCalls: normalizeOpsCounter(buckets.webhook_received || 0),
    // health_errors is the canonical error total. The specific failure buckets are
    // retained in requestBuckets so Ops Hub can inspect them without double-counting.
    errors: normalizeOpsCounter(buckets.health_errors || 0)
  };
}

function healthReason({ message = '', metadata = {}, eventType = '' } = {}) {
  const errorCode = compactString(metadata.errorCode, 120);
  const statusCode = Number(metadata.statusCode || 0);
  const durationMs = Number(metadata.durationMs || 0);
  const parts = [];
  if (errorCode) parts.push(`code=${errorCode}`);
  if (statusCode > 0) parts.push(`HTTP ${statusCode}`);
  if (parts.length) return compactString(parts.join(' · '), 1000);
  if (durationMs > 0) return compactString(`duration=${Math.round(durationMs)}ms`, 1000);
  return compactString(message || eventType || 'Appointment Lite health event', 1000);
}

/**
 * Normalize either the v0.6.16 legacy internal payload or an already-normalized
 * Ops Hub event into the exact Toolkit Ops Hub ingest event contract:
 * { eventId, occurredAt, type, data }.
 */
export function normalizeOpsHubPayload(payload = {}, { eventId = '' } = {}) {
  const contractLike = Boolean(payload?.type && payload?.data && typeof payload.data === 'object');
  const eventType = compactString(contractLike ? payload.type : payload.eventType, 80);
  if (!SUPPORTED_EVENT_SET.has(eventType)) throw new Error(`Unsupported Ops Hub event type: ${eventType || 'missing'}`);

  const occurredAt = new Date(payload.occurredAt || Date.now()).toISOString();
  const resolvedEventId = normalizeEventId(payload.eventId || eventId, eventType);
  const source = contractLike ? (payload.data || {}) : payload;
  const appVersion = compactString(
    source.version || source.appVersion || payload.appVersion || config.opsHub.appVersion || '0.6.16',
    100
  );
  const environment = compactString(
    source.environment || payload.environment || config.opsHub.environment || config.nodeEnv || 'development',
    60
  );

  let data;

  if (eventType === 'app.heartbeat') {
    data = {
      ...(appVersion ? { version: appVersion } : {}),
      ...(environment ? { environment } : {})
    };
  } else if (eventType === 'shop.installed' || eventType === 'shop.uninstalled' || eventType === 'shop.active') {
    const legacyShop = {
      externalStoreId: source.shopId || payload.shopId || '',
      handle: source.shopHandle || payload.shopHandle || '',
      primaryDomain: source.shopDomain || payload.shopDomain || '',
      shopName: source.shopName || payload.shopName || ''
    };
    const shop = opsHubStoreIdentity(source.shop || payload.shop || legacyShop);
    if (!shop) throw new Error(`Ops Hub ${eventType} requires a stable SHOPLINE store identity.`);
    const metadata = sanitizeOpsMetadata(source.metadata || payload.metadata || {});

    if (eventType === 'shop.installed') {
      const installedAt = source.installedAt || payload.installedAt || payload.shop?.installedAt;
      data = {
        shop,
        ...(installedAt ? { installedAt: new Date(installedAt).toISOString() } : {}),
        ...(Number.isInteger(Number(source.installCount)) && Number(source.installCount) >= 0
          ? { installCount: Math.min(100000, Number(source.installCount)) }
          : {}),
        ...(Object.keys(metadata).length ? { metadata } : {})
      };
    } else if (eventType === 'shop.uninstalled') {
      const uninstalledAt = source.uninstalledAt || payload.uninstalledAt || payload.shop?.uninstalledAt;
      data = {
        shop,
        ...(uninstalledAt ? { uninstalledAt: new Date(uninstalledAt).toISOString() } : {}),
        ...(Object.keys(metadata).length ? { metadata } : {})
      };
    } else {
      const requestedSource = compactString(source.source || source.metadata?.source || payload.source || payload.metadata?.source, 20);
      const activeSource = ['admin', 'storefront', 'api', 'webhook'].includes(requestedSource) ? requestedSource : 'admin';
      const lastSeenAt = source.lastSeenAt || payload.lastSeenAt || occurredAt;
      data = {
        shop,
        source: activeSource,
        lastSeenAt: new Date(lastSeenAt).toISOString(),
        ...(Object.keys(metadata).length ? { metadata } : {})
      };
    }
  } else if (eventType === 'usage.daily') {
    const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(source.dateKey || source.date || payload.date || ''))
      ? String(source.dateKey || source.date || payload.date)
      : usageDate(occurredAt);
    const requestBuckets = normalizeUsageCounters(source.requestBuckets || payload.requestBuckets || source.counters || payload.counters || {});
    const counters = source.requestBuckets || payload.requestBuckets
      ? normalizeHubUsageCounters(source.counters || payload.counters || {})
      : usageBucketsToHubCounters(requestBuckets);
    data = {
      dateKey,
      counters,
      ...(Object.keys(requestBuckets).length ? { requestBuckets } : {})
    };
  } else {
    const metadata = sanitizeOpsMetadata(source.metadata || payload.metadata || {});
    const legacyShop = {
      externalStoreId: source.shopId || payload.shopId || '',
      handle: source.shopHandle || payload.shopHandle || '',
      primaryDomain: source.shopDomain || payload.shopDomain || '',
      shopName: source.shopName || payload.shopName || ''
    };
    const shop = opsHubStoreIdentity(source.shop || payload.shop || legacyShop);
    const category = compactString(source.category || metadata.category || 'runtime', 80) || 'runtime';
    const healthEventType = compactString(source.healthEventType || (contractLike ? source.eventType : '') || metadata.reason || 'runtime.event', 160) || 'runtime.event';
    const status = normalizeHealthStatus(source.status || source.severity || metadata.severity || 'error');
    const message = compactString(source.message || payload.message || healthEventType, 500);
    const durationRaw = source.durationMs ?? metadata.durationMs;
    const durationNumber = Number(durationRaw);
    const durationMs = Number.isFinite(durationNumber) && durationNumber >= 0
      ? Math.min(86_400_000, durationNumber)
      : null;
    const requestId = compactString(source.requestId || metadata.requestId, 160);
    data = {
      ...(shop ? { shop } : {}),
      category,
      eventType: healthEventType,
      status,
      ...(message ? { message } : {}),
      reason: compactString(source.reason || healthReason({ message, metadata, eventType: healthEventType }), 1000),
      ...(durationMs !== null ? { durationMs } : {}),
      ...(requestId ? { requestId } : {}),
      ...(Object.keys(metadata).length ? { metadata } : {})
    };
  }

  return {
    eventId: resolvedEventId,
    occurredAt,
    type: eventType,
    data
  };
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
  const requestBody = { event: normalized };
  const rawBody = JSON.stringify(requestBody);
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
      const detail = opsHubResponseDetail(responsePayload);
      const suffix = detail ? `: ${detail}` : '';
      throw Object.assign(new Error(`Ops Hub ingest rejected with HTTP ${response.status}${suffix}`), {
        code: 'OPS_HUB_HTTP_ERROR', status: response.status, response: responsePayload, eventType: normalized.type
      });
    }
    return { ok: true, status: response.status, payload: responsePayload, eventType: normalized.type };
  } catch (error) {
    if (error?.name === 'AbortError' || String(error?.message || '').includes('OPS_HUB_TIMEOUT')) {
      throw Object.assign(new Error('OPS_HUB_TIMEOUT'), { code: 'OPS_HUB_TIMEOUT', status: 0, eventType: normalized.type });
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
    const payload = normalizeOpsHubPayload({
      eventId: `appointment-lite:${eventType}:${crypto.randomUUID()}`,
      eventType,
      occurredAt,
      appVersion: config.opsHub.appVersion || '0.6.16',
      environment: config.opsHub.environment || config.nodeEnv || 'development',
      ...(resolvedShop || shop ? { shop: resolvedShop || shop } : {}),
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
  return queueOpsEvent('app.heartbeat');
}

export async function queueDailyUsageSnapshots({ date = previousUsageDate() } = {}) {
  if (!opsHubConfigured()) return { queued: 0, date };
  // Ops Hub v0.2.x expects one app-level usage.daily snapshot per UTC day.
  // Appointment Lite may accumulate detailed counters per shop internally, so we
  // aggregate all rows into one Hub row and preserve the detail in requestBuckets.
  const rows = await OpsUsageDaily.find({ date }).lean();
  if (!rows.length || !rows.some(row => !row.queuedAt)) return { queued: 0, date };

  const requestBuckets = {};
  for (const row of rows) {
    const counters = normalizeUsageCounters(row.counters || {});
    for (const [key, value] of Object.entries(counters)) {
      requestBuckets[key] = normalizeOpsCounter((requestBuckets[key] || 0) + value);
    }
  }

  if (!Object.keys(requestBuckets).length) {
    await OpsUsageDaily.updateMany({ date, queuedAt: null }, { $set: { queuedAt: new Date() } });
    return { queued: 0, date };
  }

  const event = await queueOpsEvent('usage.daily', {
    date,
    counters: requestBuckets,
    dedupeKey: `usage:${date}:__all__`
  });
  if (!event) return { queued: 0, date };

  await OpsUsageDaily.updateMany({ date, queuedAt: null }, { $set: { queuedAt: new Date() } });
  return { queued: 1, date };
}

export async function requeueRecoverableOutboxEvents({ staleMs = 5 * 60_000, includeSchemaRejected = true } = {}) {
  if (!opsHubConfigured()) return { modified: 0, staleLocks: 0, schemaRejected: 0, usageSuperseded: 0 };
  const stale = new Date(Date.now() - staleMs);
  const staleResult = await OpsHubEvent.updateMany(
    { status: 'sending', lockedAt: { $lt: stale }, attempts: { $lt: MAX_OUTBOX_ATTEMPTS } },
    { $set: { status: 'failed', nextAttemptAt: new Date(), lastError: 'Recovered stale sending lock.' }, $unset: { lockedAt: 1 } }
  );

  let schemaRejected = 0;
  let usageSuperseded = 0;
  if (includeSchemaRejected) {
    // v0.6.16/hotfix.1 wrote per-shop usage rows using an older guessed contract.
    // Do not resend those as individual app-level snapshots because the Hub would
    // overwrite the same __all__ day row repeatedly. Reopen the source day and let
    // queueDailyUsageSnapshots emit one correctly aggregated replacement.
    const rejectedUsage = await OpsHubEvent.find({
      eventType: 'usage.daily',
      status: 'failed',
      lastStatusCode: 422,
      attempts: { $lt: MAX_OUTBOX_ATTEMPTS }
    }).select('_id payload').lean();
    if (rejectedUsage.length) {
      const dates = new Set();
      for (const item of rejectedUsage) {
        const raw = item?.payload || {};
        const date = raw?.data?.dateKey || raw?.date || raw?.dateKey;
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) dates.add(String(date));
      }
      if (dates.size) {
        await OpsUsageDaily.updateMany({ date: { $in: [...dates] } }, { $set: { queuedAt: null } });
      }
      const ids = rejectedUsage.map(item => item._id);
      const superseded = await OpsHubEvent.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            status: 'failed',
            attempts: MAX_OUTBOX_ATTEMPTS,
            lastError: 'Superseded by v0.6.16-hotfix.2 app-level usage.daily contract alignment.'
          },
          $unset: { lockedAt: 1 }
        }
      );
      usageSuperseded = superseded.modifiedCount || 0;
    }

    const schemaResult = await OpsHubEvent.updateMany(
      {
        eventType: { $ne: 'usage.daily' },
        status: 'failed',
        lastStatusCode: 422,
        attempts: { $lt: MAX_OUTBOX_ATTEMPTS }
      },
      { $set: { nextAttemptAt: new Date(), lastError: 'Retrying after Ops Hub payload compatibility normalization and v0.2.x contract alignment.' } }
    );
    schemaRejected = schemaResult.modifiedCount || 0;
  }

  const staleLocks = staleResult.modifiedCount || 0;
  return {
    modified: staleLocks + schemaRejected + usageSuperseded,
    staleLocks,
    schemaRejected,
    usageSuperseded
  };
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
      const normalized = normalizeOpsHubPayload(event.payload || {}, { eventId: `appointment-lite:${String(event._id)}` });
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
      // Keep this on stdout as a structured single line. Railway otherwise
      // splits console.warn object output and can surface a lone `}` as an error.
      console.log(opsHubDiagnosticLine('ops_hub.delivery_failed', {
        level: 'warn',
        eventType: event.eventType,
        statusCode: status,
        attempt: event.attempts,
        code: error?.code || '',
        message: error?.message || 'Ops Hub delivery failed.'
      }));
      failed += 1;
    }
  }
  return { sent, failed, skipped: false };
}
