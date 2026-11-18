import test from 'node:test';
import assert from 'node:assert/strict';
import { reachGap, nextHospital, fallbackStatuses } from './escalation.js';

const rank = (...ids) => ({ ranked: ids.map((id) => ({ hospital: { id } })), ruledOut: [] });

test('reachGap: empty list of suitable hospitals says no_hospital while the alert waits', () => {
  assert.equal(reachGap(rank(), { state: 'SOS_SENT' }), 'no_hospital');
  assert.equal(reachGap(rank(), { state: 'ESCALATED' }), 'no_hospital');
});

test('reachGap: nothing to say once the alert is acknowledged, cancelled or finished', () => {
  for (const state of ['ACKNOWLEDGED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDED_OVER', 'CANCELLED']) {
    assert.equal(reachGap(rank(), { state }), null, state);
  }
});

test('reachGap: no ranking yet means no message (never a crash)', () => {
  assert.equal(reachGap(null, { state: 'SOS_SENT' }), null);
  assert.equal(reachGap(undefined, { state: 'SOS_SENT' }), null);
});

test('reachGap: a next hospital still exists, so no message', () => {
  const e = { state: 'SOS_SENT', alerted_hospital_id: 'A', alerted_ids: [] };
  assert.equal(reachGap(rank('A', 'B'), e), null);
});

test('reachGap: alerted hospital is the last one on the list', () => {
  const e = { state: 'ESCALATED', alerted_hospital_id: 'B', alerted_ids: ['A'] };
  assert.equal(nextHospital(rank('A', 'B').ranked, e), null);
  assert.equal(reachGap(rank('A', 'B'), e), 'last_hospital');
});

test('reachGap: a single hospital that has not answered is the last hospital', () => {
  const e = { state: 'SOS_SENT', alerted_hospital_id: 'A', alerted_ids: [] };
  assert.equal(reachGap(rank('A'), e), 'last_hospital');
});

test('fallbackStatuses on an empty list is an empty object, not an error', () => {
  assert.deepEqual(fallbackStatuses([], { state: 'SOS_SENT' }), {});
});
