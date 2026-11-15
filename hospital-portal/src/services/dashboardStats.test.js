import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardStats } from './dashboardStats.js';

const e = (id, state, extra = {}) => ({ emergency_id: id, state, ...extra });

test('empty list: real zeros once loaded, no value while still loading', () => {
  const done = dashboardStats([], { loaded: true });
  assert.deepEqual([done.active.value, done.onCall.value, done.unacknowledged.value, done.escalated.value], [0, 0, 0, 0]);
  const wait = dashboardStats([], { loaded: false });
  assert.deepEqual([wait.active.value, wait.onCall.value, wait.unacknowledged.value, wait.escalated.value], [null, null, null, null]);
  assert.equal(dashboardStats(undefined).active.value, 0);
});
test('active = not finished; finished and cancelled are not counted', () => {
  const s = dashboardStats([e(1, 'SOS_SENT'), e(2, 'EN_ROUTE'), e(3, 'HANDOVER_DONE'), e(4, 'CANCELLED')]);
  assert.equal(s.active.value, 2);
});
test('unacknowledged = SOS_SENT only; escalated = ESCALATED only; acknowledged and early alerts are in neither', () => {
  const s = dashboardStats([e(1, 'SOS_SENT'), e(2, 'ESCALATED'), e(3, 'HOSPITAL_ACKNOWLEDGED'), e(4, 'MONITORING'), e(5, 'SOS_SENT', { escalation_level: 1 }), e(6, 'ESCALATED')]);
  assert.equal(s.unacknowledged.value, 2);
  assert.equal(s.escalated.value, 2);
});
test('ambulances on a call: distinct units named by open real alerts only', () => {
  const s = dashboardStats([
    e(1, 'AMBULANCE_DISPATCHED', { ambulance_id: 'A1' }),
    e(2, 'EN_ROUTE', { ambulance_id: 'A1' }),
    e(3, 'ARRIVED', { ambulance_id: 'A2' }),
    e(4, 'HANDOVER_DONE', { ambulance_id: 'A3' }),
    e(5, 'SOS_SENT'),
  ]);
  assert.equal(s.onCall.value, 2);
  assert.equal(s.onCall.simulated, false);
});
test('a sample fleet marks the on-call tile as simulated', () => {
  assert.equal(dashboardStats([], { units: [{ id: 'A1', sample: true }] }).onCall.simulated, true);
  assert.equal(dashboardStats([], { units: [{ id: 'A1' }] }).onCall.simulated, false);
});
test('beds: only a real number counts; not shared, missing or no hospital is null', () => {
  const h = (availability) => ({ id: 'h1', name: 'H', capabilities: {}, availability });
  assert.equal(dashboardStats([], { hospital: h({ beds_free: 7 }) }).beds.value, 7);
  assert.equal(dashboardStats([], { hospital: h({ beds_free: 0 }) }).beds.value, 0);
  assert.equal(dashboardStats([], { hospital: h({ beds_free: null }) }).beds.value, null);
  assert.equal(dashboardStats([], { hospital: h(undefined) }).beds.value, null);
  assert.equal(dashboardStats([], { hospital: null }).beds.value, null);
});
