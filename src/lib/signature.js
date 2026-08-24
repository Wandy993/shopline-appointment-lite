import crypto from 'node:crypto';

export function hmacHex(source, secret) {
  return crypto.createHmac('sha256', secret).update(source).digest('hex');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function canonicalQuery(params) {
  const entries = [];
  for (const [key, value] of Object.entries(params)) {
    if (key === 'sign' || value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) entries.push([key, String(item)]);
  }
  entries.sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(entries).toString();
}

export function verifyShoplineQuery(params, secret, maxAgeMs = 10 * 60 * 1000) {
  const received = String(params.sign || '');
  if (!received || !safeEqual(hmacHex(canonicalQuery(params), secret), received)) return false;
  const timestamp = Number(params.timestamp);
  return Number.isFinite(timestamp) && Math.abs(Date.now() - timestamp) <= maxAgeMs;
}

export function signPayload(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${hmacHex(encoded, secret)}`;
}

export function readSignedPayload(value, secret) {
  const [encoded, received] = String(value || '').split('.');
  if (!encoded || !received || !safeEqual(hmacHex(encoded, secret), received)) return null;
  try { return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); }
  catch { return null; }
}
