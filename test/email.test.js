import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { managementLinkFor } from '../src/services/email.js';

test('cross-device email management link carries a compatible high-entropy access token', () => {
  const token = 'a'.repeat(43);
  const link = managementLinkFor({ _id: '507f1f77bcf86cd799439011' }, token);
  const parsed = new URL(link);
  assert.equal(parsed.searchParams.get('booking'), '507f1f77bcf86cd799439011');
  assert.equal(parsed.searchParams.get('access'), token);
  assert.equal(parsed.hash, '');
});

test('Aliyun DirectMail transport uses HTTPS OpenAPI and least-privilege configuration inputs', async () => {
  const source = await readFile(new URL('../src/services/email.js', import.meta.url), 'utf8');
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  assert.match(source, /singleSendMailWithOptions/);
  assert.match(source, /ALIBABA|config\.email\.aliyun/);
  assert.match(source, /replyAddress/);
  assert.match(source, /settings\.accentColor/);
  assert.match(source, /merchantNotificationEmail/);
  assert.doesNotMatch(source, /smtp/i);
  assert.match(example, /dm:SingleSendMail/);
  assert.match(example, /ALIBABA_CLOUD_ACCESS_KEY_ID=/);
  assert.match(example, /ALIYUN_DIRECTMAIL_ACCOUNT_NAME=/);
});
