import test from 'node:test';
import assert from 'node:assert/strict';
import { stepDurations, summarise, escalationCount } from './analytics.js';

const T0 = Date.parse('2026-11-12T10:00:00Z');
const at = (s) => new Date(T0 + s * 1000).toISOString();
const full = (over = {}) => ({
  emergency_id: 'E-1', type: 'HEART', severity: 'EMERGENCY', state: 'HANDOVER_DONE', created_at: at(0), ambulance_id: 'AMB-1',
  status_events: [
    { state: 'SOS_SENT', timestamp: at(0) },
    { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(20) },
    { state: 'AMBULANCE_DISPATCHED', timestamp: at(50) },
    { state: 'EN_ROUTE', timestamp: at(55) },
    { state: 'ARRIVED', timestamp: at(350) },
    { state: 'HANDOVER_DONE', timestamp: at(410) },
  ],
  ...over,
});

test('stepDurations works out every step from the timeline', () => {
  assert.deepEqual(stepDurations(full()), { alert_to_ack: 20, ack_to_dispatch: 30, dispatch_to_arrival: 300, arrival_to_handover: 60, total: 410 });
});

test('stepDurations: steps never reached are null and total waits for the end', () => {
  const open = full({ state: 'EN_ROUTE', status_events: full().status_events.slice(0, 4) });
  const d = stepDurations(open);
  assert.equal(d.alert_to_ack, 20);
  assert.equal(d.dispatch_to_arrival, null);
  assert.equal(d.arrival_to_handover, null);
  assert.equal(d.total, null);
});

test('stepDurations: a cancelled case has a total but no later steps', () => {
  const c = { emergency_id: 'E-2', type: 'ASTHMA', state: 'CANCELLED', created_at: at(0), status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'CANCELLED', timestamp: at(45) }] };
  const d = stepDurations(c);
  assert.equal(d.total, 45);
  assert.equal(d.alert_to_ack, null);
});

test('stepDurations: alert time falls back to created_at, order of events does not matter', () => {
  const e = full({ status_events: [...full().status_events.slice(1)].reverse() });
  assert.equal(stepDurations(e).alert_to_ack, 20);
});

test('stepDurations: a bad or reversed time gives null, never a negative number', () => {
  const e = full({ status_events: [{ state: 'SOS_SENT', timestamp: at(100) }, { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: 'nonsense' }] });
  assert.equal(stepDurations(e).alert_to_ack, null);
  const r = full({ created_at: at(100), status_events: [{ state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(10) }] });
  assert.equal(stepDurations(r).alert_to_ack, null);
});

test('escalationCount reads events or the counter', () => {
  assert.equal(escalationCount(full()), 0);
  assert.equal(escalationCount({ status_events: [{ state: 'ESCALATED' }, { state: 'ESCALATED' }] }), 2);
  assert.equal(escalationCount({ escalation_level: 1, status_events: [] }), 1);
});

test('summarise: counts, averages, escalations and ambulance use', () => {
  const a = full();
  const b = full({ emergency_id: 'E-3', type: 'STROKE', ambulance_id: 'AMB-2', status_events: [...full().status_events.slice(0, 1), { state: 'ESCALATED', timestamp: at(30) }, { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(40) }, ...full().status_events.slice(2).map((e) => ({ ...e, timestamp: at(((Date.parse(e.timestamp) - T0) / 1000) + 20) }))] });
  const c = { emergency_id: 'E-4', type: 'ASTHMA', severity: 'URGENT', state: 'CANCELLED', created_at: at(0), status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'CANCELLED', timestamp: at(45) }] };
  const open = { emergency_id: 'E-5', type: 'DIABETIC', severity: 'URGENT', state: 'SOS_SENT', created_at: at(0), status_events: [{ state: 'SOS_SENT', timestamp: at(0) }] };
  const s = summarise([a, b, c, open], [{ id: 'AMB-1', call_sign: 'Alpha 1' }]);
  assert.equal(s.total, 4);
  assert.deepEqual([s.finished, s.cancelled, s.open], [2, 1, 1]);
  assert.deepEqual(s.byType, { HEART: 1, STROKE: 1, DIABETIC: 1, ASTHMA: 1 });
  assert.deepEqual(s.bySeverity, { EMERGENCY: 2, URGENT: 2, WATCH: 0 });
  assert.equal(s.byState.CANCELLED, 1);
  assert.deepEqual(s.averages.alert_to_ack, { count: 2, seconds: 30 }); // (20 + 40) / 2
  assert.deepEqual(s.averages.arrival_to_handover, { count: 2, seconds: 60 });
  assert.deepEqual(s.escalations, { cases: 1, times: 1 });
  assert.equal(s.ambulance.trips, 2);
  assert.deepEqual(s.ambulance.units.map((u) => [u.id, u.name, u.trips]), [['AMB-1', 'Alpha 1', 1], ['AMB-2', 'AMB-2', 1]]);
});

test('summarise: no data gives zero counts and null averages, never NaN', () => {
  const s = summarise([]);
  assert.equal(s.total, 0);
  assert.equal(s.averages.alert_to_ack.seconds, null);
  assert.equal(s.averageTotal.seconds, null);
  assert.deepEqual(s.ambulance.units, []);
});
