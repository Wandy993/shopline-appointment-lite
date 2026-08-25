import { config } from '../config.js';
import { hmacHex } from '../lib/signature.js';
import { Shop } from '../models/Shop.js';

function tokenFields(payload) {
  const data = payload?.data || payload || {};
  return {
    accessToken: data.accessToken || data.access_token || '',
    expireTime: data.expireTime || data.expire_time || '',
    scope: data.scope || ''
  };
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
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
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
  const response = await fetch(`https://${handle}.myshopline.com/admin/graph/${config.shopline.apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000)
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
