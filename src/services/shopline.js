import { config } from '../config.js';
import { hmacHex } from '../lib/signature.js';
import { Shop } from '../models/Shop.js';

function tokenFields(payload) {
  const data = payload?.data || payload || {};
  return {
    accessToken: data.accessToken || data.access_token || '',
    refreshToken: data.refreshToken || data.refresh_token || '',
    expireTime: data.expireTime || data.expire_time || '',
    scope: data.scope || ''
  };
}

async function signedTokenPost(handle, path, body) {
  const rawBody = JSON.stringify(body);
  const timestamp = String(Date.now());
  const response = await fetch(`https://${handle}.myshopline.com${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      appkey: config.shopline.appKey,
      timestamp,
      sign: hmacHex(rawBody + timestamp, config.shopline.appSecret)
    },
    body: rawBody,
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
  const shop = await Shop.findById(shopId).select('+accessToken +refreshToken');
  if (!shop) throw new Error('Shop not found');
  if (shop.tokenExpiresAt && shop.refreshToken && shop.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    const token = await signedTokenPost(shop.handle, '/admin/oauth/token/refresh', { refreshToken: shop.refreshToken });
    shop.accessToken = token.accessToken;
    if (token.refreshToken) shop.refreshToken = token.refreshToken;
    if (token.expireTime) shop.tokenExpiresAt = new Date(token.expireTime);
    await shop.save();
  }
  return { handle: shop.handle, accessToken: shop.accessToken };
}

export async function shoplineGet(shopId, endpoint, query = {}) {
  const { handle, accessToken } = await accessTokenForShop(shopId);
  const url = new URL(`https://${handle}.myshopline.com/admin/openapi/${config.shopline.apiVersion}/${endpoint}`);
  for (const [key, value] of Object.entries(query)) if (value !== '' && value != null) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`SHOPLINE API failed (${response.status}): ${payload.message || payload.errors || 'unknown error'}`);
  return payload;
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
