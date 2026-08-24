import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalQuery, hmacHex, readSignedPayload, signPayload, verifyShoplineQuery } from '../src/lib/signature.js';

test('canonicalQuery removes sign and sorts/encodes values', () => {
  assert.equal(canonicalQuery({ timestamp: '2', handle: 'demo shop', sign: 'ignored', appkey: 'a' }), 'appkey=a&handle=demo+shop&timestamp=2');
});

test('SHOPLINE query signature verifies within timestamp window', () => {
  const params = { appkey: 'key', handle: 'demo', timestamp: String(Date.now()) };
  params.sign = hmacHex(canonicalQuery(params), 'secret');
  assert.equal(verifyShoplineQuery(params, 'secret'), true);
  assert.equal(verifyShoplineQuery({ ...params, handle: 'tampered' }, 'secret'), false);
});

test('signed session payload rejects tampering', () => {
  const signed = signPayload({ shopId: '123', exp: 999 }, 'secret');
  assert.deepEqual(readSignedPayload(signed, 'secret'), { shopId: '123', exp: 999 });
  assert.equal(readSignedPayload(`${signed}x`, 'secret'), null);
});
