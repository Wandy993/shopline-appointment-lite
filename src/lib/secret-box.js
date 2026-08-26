import crypto from 'node:crypto';

function keyFromMaterial(material) {
  const value = String(material || '').trim();
  if (!value) throw new Error('Secret encryption key is not configured.');

  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, 'hex');

  let decoded;
  try { decoded = Buffer.from(value, 'base64'); }
  catch { decoded = null; }
  if (decoded?.length === 32) return decoded;

  throw new Error('Secret encryption key must be 32 bytes encoded as 64 hex characters or base64.');
}

export function isValidSecretKeyMaterial(material) {
  try {
    keyFromMaterial(material);
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(value, material) {
  const plaintext = String(value || '');
  if (!plaintext) throw new Error('Cannot encrypt an empty secret.');
  const key = keyFromMaterial(material);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload, material) {
  const [version, ivValue, tagValue, encryptedValue] = String(payload || '').split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) throw new Error('Encrypted secret payload is invalid.');
  const key = keyFromMaterial(material);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}
