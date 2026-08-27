import { createHmac, timingSafeEqual } from 'node:crypto';

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyShoplineWebhookSignature(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || !signature || !secret) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest();
  return safeEqual(signature, digest.toString('hex')) || safeEqual(signature, digest.toString('base64'));
}
