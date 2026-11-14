import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultScope, inScope, scopeList, hiddenCount, elsewhereLabel, isElsewhere } from './queueScope.js';

const A = { emergency_id: 'A', state: 'SOS_SENT', alerted_hospital_id: 'h1' };
const B = { emergency_id: 'B', state: 'SOS_SENT', alerted_hospital_id: 'h2', alerted_hospital_name: 'City Care' };
const C = { emergency_id: 'C', state: 'SOS_SENT' }; // no hospital yet
const D = { emergency_id: 'D', state: 'CANCELLED', alerted_hospital_id: 'h2' };
const all = [A, B, C, D];

test('default scope: mine in real mode, all in mock mode', () => {
  assert.equal(defaultScope(false), 'mine');
  assert.equal(defaultScope(true), 'all');
});

test('"mine" shows this hospital and alerts with no hospital, hides other hospitals', () => {
  assert.deepEqual(scopeList(all, 'h1', 'mine').map((e) => e.emergency_id), ['A', 'C']);
  assert.deepEqual(scopeList(all, 'h1', 'all').map((e) => e.emergency_id), ['A', 'B', 'C', 'D']);
});

test('ids are compared as text (number vs string)', () => {
  assert.equal(inScope({ alerted_hospital_id: 7 }, '7', 'mine'), true);
  assert.equal(isElsewhere({ alerted_hospital_id: 8 }, '7'), true);
});

test('unknown own hospital hides nothing', () => {
  assert.equal(scopeList(all, null, 'mine').length, 4);
});

test('hidden count counts only open alerts at other hospitals, and is 0 under "all"', () => {
  assert.equal(hiddenCount(all, 'h1', 'mine'), 1); // B only; D is cancelled
  assert.equal(hiddenCount(all, 'h1', 'all'), 0);
});

test('escalate away: leaves "mine", shows "now at <hospital>" under "all"', () => {
  const moved = { ...A, alerted_hospital_id: 'h2', alerted_hospital_name: 'City Care' };
  assert.equal(inScope(moved, 'h1', 'mine'), false);
  assert.equal(elsewhereLabel(moved, 'h1', []), 'now at City Care');
  assert.equal(elsewhereLabel(A, 'h1', []), null);
  assert.equal(elsewhereLabel(C, 'h1', []), null);
});

test('label falls back to the hospital list, then to the id', () => {
  assert.equal(elsewhereLabel({ alerted_hospital_id: 'h9' }, 'h1', [{ id: 'h9', name: 'North Hospital' }]), 'now at North Hospital');
  assert.equal(elsewhereLabel({ alerted_hospital_id: 'h9' }, 'h1', []), 'now at h9');
});
