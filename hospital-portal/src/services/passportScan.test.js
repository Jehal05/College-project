import test from 'node:test';
import assert from 'node:assert/strict';
import { parseToken, scanErrorKey, PURPOSES } from './passportScan.js';

const TOKEN = 'abcDEF123_-abcDEF123_-xy';
test('parseToken reads a pasted QR link or a bare token', () => {
  assert.equal(parseToken('http://192.168.1.5:4000/p/' + TOKEN), TOKEN);
  assert.equal(parseToken('  http://x/p/' + TOKEN + '/  '), TOKEN);
  assert.equal(parseToken('http://x/p/' + TOKEN + '?a=1'), TOKEN);
  assert.equal(parseToken(TOKEN), TOKEN);
});
test('parseToken refuses text that cannot be a token', () => {
  for (const bad of ['', null, undefined, 'short', 'http://x/p/short', 'PT-2026-0417 PT-2026-0417 ok!', '<script>alert(1)</script>']) assert.equal(parseToken(bad), null);
});
test('bad links all map to the same neutral key', () => {
  assert.equal(scanErrorKey({ status: 410 }), 'ps.unavailable');
  assert.equal(scanErrorKey({ status: 404 }), 'ps.unavailable');
  assert.equal(scanErrorKey({ status: 403 }), 'ps.denied');
  assert.equal(scanErrorKey({ status: 400 }), 'ps.needPurpose');
  assert.equal(scanErrorKey(new Error('x')), 'ps.error');
});
test('four purposes, none empty', () => { assert.equal(PURPOSES.length, 4); assert.ok(PURPOSES.every(Boolean)); });
