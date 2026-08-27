import { config } from '../config.js';
import crypto from 'node:crypto';
import { hmacHex, signPayload } from '../lib/signature.js';
import { Shop } from '../models/Shop.js';

function tokenFields(payload) {
  const data = payload?.data || payload || {};
  return {
    accessToken: data.accessToken || data.access_token || '',
    expireTime: data.expireTime || data.expire_time || '',
    scope: data.scope || ''
  };
}

const SHOPLINE_TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function shoplineFetchWithRetry(url, options = {}, { attempts = 2, timeoutMs = 15000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
      if (attempt + 1 < attempts && SHOPLINE_TRANSIENT_STATUSES.has(response.status)) {
        await response.arrayBuffer().catch(() => {});
        lastError = Object.assign(new Error(`SHOPLINE transient HTTP ${response.status}`), { status: response.status });
        await wait(300 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt + 1 >= attempts) throw error;
      await wait(300 * (attempt + 1));
    }
  }
  throw lastError || new Error('SHOPLINE request failed.');
}

export function signedTokenRequestParts(body, timestamp = String(Date.now())) {
  const hasBody = body !== undefined && body !== null;
  const rawBody = hasBody ? JSON.stringify(body) : '';
  return {
    rawBody,
    timestamp,
    headers: {
      'Content-Type': 'application/json',
      appkey: config.shopline.appKey,
      timestamp,
      sign: hmacHex(rawBody + timestamp, config.shopline.appSecret)
    }
  };
}

async function signedTokenPost(handle, path, body) {
  const { rawBody, headers } = signedTokenRequestParts(body);
  const response = await fetch(`https://${handle}.myshopline.com${path}`, {
    method: 'POST',
    headers,
    ...(rawBody ? { body: rawBody } : {}),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload.code && payload.code !== 200)) {
    throw new Error(`SHOPLINE token request failed (${response.status}): ${payload.message || payload.i18nCode || 'unknown error'}`);
  }
  return tokenFields(payload);
}

export function authorizationUrl(handle, customField) {
  const query = new URLSearchParams({
    appKey: config.shopline.appKey,
    responseType: 'code',
    scope: config.shopline.scopes,
    redirectUri: config.shopline.callbackUrl,
    customField
  });
  return `https://${handle}.myshopline.com/admin/oauth-web/#/oauth/authorize?${query}`;
}

export const SHOPLINE_ORDER_SCOPE = 'read_orders';
export const SHOPLINE_LOCATION_SCOPE = 'read_location';

export function shoplineOrderAccessStatus(shop = {}) {
  const scopes = new Set((shop.scopes || []).map(value => String(value || '').trim()).filter(Boolean));
  const granted = scopes.has(SHOPLINE_ORDER_SCOPE);
  return { requiredScope: SHOPLINE_ORDER_SCOPE, granted, missingScopes: granted ? [] : [SHOPLINE_ORDER_SCOPE] };
}


export function shoplineLocationAccessStatus(shop = {}) {
  const scopes = new Set((shop.scopes || []).map(value => String(value || '').trim()).filter(Boolean));
  const granted = scopes.has(SHOPLINE_LOCATION_SCOPE);
  return { requiredScope: SHOPLINE_LOCATION_SCOPE, granted, missingScopes: granted ? [] : [SHOPLINE_LOCATION_SCOPE] };
}

export function reauthorizationUrlForShop(shop) {
  const handle = String(shop?.handle || '').toLowerCase();
  if (!handle) return '';
  const customField = signPayload({ handle, nonce: crypto.randomUUID(), exp: Date.now() + 10 * 60 * 1000 }, config.sessionSecret);
  return authorizationUrl(handle, customField);
}

export function exchangeAuthorizationCode(handle, code) {
  return signedTokenPost(handle, '/admin/oauth/token/create', { code });
}

export async function accessTokenForShop(shopId) {
  const shop = await Shop.findById(shopId).select('+accessToken');
  if (!shop) throw new Error('Shop not found');
  if (shop.tokenExpiresAt && shop.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    // SHOPLINE refreshes the access token with a signed POST that has no request body.
    // The current authorization response does not include a separate refresh token.
    const token = await signedTokenPost(shop.handle, '/admin/oauth/token/refresh');
    if (!token.accessToken) throw new Error('SHOPLINE did not return an access token while refreshing');
    shop.accessToken = token.accessToken;
    if (token.expireTime) shop.tokenExpiresAt = new Date(token.expireTime);
    if (token.scope) shop.scopes = String(token.scope).split(',').filter(Boolean);
    await shop.save();
  }
  return { handle: shop.handle, accessToken: shop.accessToken };
}

export async function shoplineGetPage(shopId, endpoint, query = {}) {
  const { handle, accessToken } = await accessTokenForShop(shopId);
  const url = new URL(`https://${handle}.myshopline.com/admin/openapi/${config.shopline.apiVersion}/${endpoint}`);
  for (const [key, value] of Object.entries(query)) if (value !== '' && value != null) url.searchParams.set(key, value);
  const response = await shoplineFetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json; charset=utf-8' }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`SHOPLINE API failed (${response.status}): ${payload.message || payload.errors || 'unknown error'}`);
  return { payload, link: response.headers.get('link') || '' };
}

export async function shoplineGet(shopId, endpoint, query = {}) {
  return (await shoplineGetPage(shopId, endpoint, query)).payload;
}

export async function shoplineGraphql(shopId, query, variables = {}) {
  const { handle, accessToken } = await accessTokenForShop(shopId);
  const response = await shoplineFetchWithRetry(`https://${handle}.myshopline.com/admin/graph/${config.shopline.apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(error => error.message).filter(Boolean).join('; ') || payload.message || 'unknown error';
    throw new Error(`SHOPLINE GraphQL failed (${response.status}): ${message}`);
  }
  return payload.data || {};
}

export async function syncShopMetadata(shopId) {
  const payload = await shoplineGet(shopId, 'merchants/shop.json');
  const data = payload.data || payload.shop || payload;
  const update = {
    timezone: data.iana_timezone || 'UTC',
    email: data.email || data.customer_email || '',
    primaryDomain: String(data.domain || '').toLowerCase()
  };
  if (data.id !== undefined && data.id !== null && String(data.id)) update.shoplineStoreId = String(data.id);
  await Shop.updateOne({ _id: shopId }, { $set: update });
  return update;
}

export async function shoplinePost(shopId, endpoint, body = {}) {
  const { handle, accessToken } = await accessTokenForShop(shopId);
  const response = await fetch(`https://${handle}.myshopline.com/admin/openapi/${config.shopline.apiVersion}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(`SHOPLINE API failed (${response.status}): ${payload.message || payload.errors || 'unknown error'}`), { status: response.status, payload });
  return payload;
}

export async function ensureBookingCommerceWebhooks(shopId) {
  const address = `${config.appUrl}/webhooks/shopline`;
  const topics = ['orders/create', 'orders/paid', 'order_transactions/create', 'orders/cancelled'];
  const results = [];

  let existing = [];
  try {
    const payload = await shoplineGet(shopId, 'webhooks.json');
    const raw = payload?.webhooks ?? payload?.data?.webhooks ?? payload?.data ?? [];
    existing = Array.isArray(raw) ? raw : [];
  } catch (error) {
    // Listing subscriptions is an optimization. If it fails we still attempt to
    // create the required subscriptions and rely on duplicate handling below.
    existing = [];
  }

  for (const topic of topics) {
    const found = existing.find(item => {
      const currentTopic = String(item?.topic || item?.event || '').trim();
      const currentAddress = String(item?.address || item?.callback_url || item?.callbackUrl || '').trim();
      return currentTopic === topic && currentAddress === address;
    });
    if (found) {
      results.push({ topic, ok: true, existing: true, id: String(found.id || found.webhook_id || '') });
      continue;
    }

    try {
      const payload = await shoplinePost(shopId, 'webhooks.json', { webhook: { address, api_version: config.shopline.apiVersion, topic } });
      results.push({ topic, ok: true, created: true, id: payload?.webhook?.id || payload?.data?.webhook?.id || '' });
    } catch (error) {
      // SHOPLINE may reject a duplicate subscription. Existing subscriptions are
      // already sufficient, so do not block the merchant from saving the service.
      const message = String(error.message || '');
      const duplicate = /duplicate|already|exist/i.test(message) || Number(error.status) === 409 || Number(error.status) === 422;
      results.push({ topic, ok: duplicate, duplicate, error: duplicate ? '' : message });
    }
  }
  return results;
}


export const ensurePaidBookingWebhooks = ensureBookingCommerceWebhooks;
