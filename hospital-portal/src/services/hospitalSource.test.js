import test from 'node:test';
import assert from 'node:assert/strict';
import { isHospitalFallback, setHospitalFallback, onHospitalFallback } from './hospitalSource.js';

test('the flag changes, listeners hear only real changes, and unsubscribe works', () => {
  const seen = [];
  const off = onHospitalFallback((v) => seen.push(v));
  assert.equal(isHospitalFallback(), false);
  setHospitalFallback(true);
  setHospitalFallback(true);
  setHospitalFallback(false);
  off();
  setHospitalFallback(true);
  assert.deepEqual(seen, [true, false]);
  setHospitalFallback(false);
});
