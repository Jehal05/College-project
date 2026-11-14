import test from 'node:test';
import assert from 'node:assert/strict';
import { healthStep, recordCheck, resetHealth, isBackendDown, onBackendDown, MISSES_FOR_DOWN } from './backendHealth.js';

test('one miss is not enough; two in a row mean down; one good answer clears it', () => {
  let s = { misses: 0, down: false };
  s = healthStep(s, false);
  assert.deepEqual(s, { misses: 1, down: false });
  s = healthStep(s, false);
  assert.equal(s.down, true);
  assert.equal(MISSES_FOR_DOWN, 2);
  s = healthStep(s, true);
  assert.deepEqual(s, { misses: 0, down: false });
  assert.deepEqual(healthStep(undefined, false), { misses: 1, down: false });
});

test('the store tells listeners only when the down state really changes', () => {
  resetHealth();
  const seen = [];
  const off = onBackendDown((d) => seen.push(d));
  recordCheck(false);
  recordCheck(false);
  recordCheck(false);
  assert.equal(isBackendDown(), true);
  recordCheck(true);
  recordCheck(true);
  assert.equal(isBackendDown(), false);
  off();
  assert.deepEqual(seen, [true, false]);
});
