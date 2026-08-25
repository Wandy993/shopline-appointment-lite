import test from 'node:test';
import assert from 'node:assert/strict';
import { hmacHex } from '../src/lib/signature.js';
import { signedTokenRequestParts } from '../src/services/shopline.js';
import { config } from '../src/config.js';

test('SHOPLINE refresh request signs an empty body plus timestamp', () => {
  const timestamp = '1787620000000';
  const request = signedTokenRequestParts(undefined, timestamp);
  assert.equal(request.rawBody, '');
  assert.equal(request.headers.timestamp, timestamp);
  assert.equal(request.headers.sign, hmacHex(timestamp, config.shopline.appSecret));
});

test('SHOPLINE create-token request signs the JSON body plus timestamp', () => {
  const timestamp = '1787620000000';
  const request = signedTokenRequestParts({ code: 'abc123' }, timestamp);
  assert.equal(request.rawBody, '{"code":"abc123"}');
  assert.equal(request.headers.sign, hmacHex(request.rawBody + timestamp, config.shopline.appSecret));
});
