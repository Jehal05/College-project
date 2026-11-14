import test from 'node:test';
import assert from 'node:assert/strict';
import { stateFromError, shortDetail, NO_ERROR } from './errorBoundary.js';

test('an error turns into a failed state with one short line', () => {
  const s = stateFromError(new Error('Cannot read properties of undefined\n    at Foo (app.js:1:1)'));
  assert.equal(s.failed, true);
  assert.equal(s.detail, 'Cannot read properties of undefined');
});
test('no stack trace is kept', () => assert.ok(!shortDetail(new Error('x\n at y')).includes('at y')));
test('a token in the message is hidden', () => {
  assert.ok(!shortDetail(new Error('failed with Bearer abc123def456')).includes('abc123'));
  assert.ok(!shortDetail(new Error('key abcdefghijklmnopqrstuvwxyz0123456789')).includes('abcdefghijklmnopqrstuvwxyz'));
});
test('a long message is cut', () => assert.ok(shortDetail(new Error('a b '.repeat(100))).length <= 120));
test('a thrown string or nothing does not crash it', () => {
  assert.equal(shortDetail('boom'), 'boom');
  assert.equal(shortDetail(undefined), '');
});
test('NO_ERROR is not failed', () => assert.equal(NO_ERROR.failed, false));
