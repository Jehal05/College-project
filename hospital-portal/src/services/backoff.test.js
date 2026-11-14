import test from 'node:test';
import assert from 'node:assert/strict';
import { reconnectDelay, BASE_MS, MAX_MS } from './backoff.js';

test('the delay doubles from about 2 s and stops at 30 s (no jitter: random = 0.5)', () => {
  const d = (n) => reconnectDelay(n, () => 0.5);
  assert.deepEqual([0, 1, 2, 3, 4].map(d), [2000, 4000, 8000, 16000, 30000]);
  assert.equal(d(50), MAX_MS);
});

test('jitter stays within 10 % either way and never goes above 30 s', () => {
  assert.equal(reconnectDelay(0, () => 0), BASE_MS * 0.9);
  assert.equal(reconnectDelay(0, () => 1), BASE_MS * 1.1);
  assert.equal(reconnectDelay(9, () => 1), MAX_MS);
});

test('bad input behaves like the first attempt', () => {
  for (const bad of [undefined, null, -3, NaN, 'x']) assert.equal(reconnectDelay(bad, () => 0.5), 2000);
});
