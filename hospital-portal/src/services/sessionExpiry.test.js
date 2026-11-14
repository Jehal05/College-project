import test from 'node:test';
import assert from 'node:assert/strict';
import { markExpired, takeExpiredNotice, onSessionExpired } from './sessionExpiry.js';

const fakeStore = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), has: (k) => m.has(k) };
};

test('a logged-in session is cleared once and listeners are told', () => {
  const store = fakeStore();
  let cleared = 0;
  let told = 0;
  const off = onSessionExpired(() => told++);
  assert.equal(markExpired(() => 'tok', () => cleared++, store), true);
  assert.equal(cleared, 1);
  assert.equal(told, 1);
  off();
});
test('nobody logged in: nothing happens', () => {
  let cleared = 0;
  assert.equal(markExpired(() => null, () => cleared++, fakeStore()), false);
  assert.equal(cleared, 0);
});
test('the login note is shown once, then gone', () => {
  const store = fakeStore();
  markExpired(() => 'tok', () => {}, store);
  assert.equal(takeExpiredNotice(store), true);
  assert.equal(takeExpiredNotice(store), false);
});
test('a blocked storage does not crash', () => {
  const bad = { setItem() { throw new Error('blocked'); }, getItem() { throw new Error('blocked'); }, removeItem() {} };
  assert.doesNotThrow(() => markExpired(() => 'tok', () => {}, bad));
  assert.equal(takeExpiredNotice(bad), false);
});
