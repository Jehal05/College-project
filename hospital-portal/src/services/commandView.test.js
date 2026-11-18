import test from 'node:test';
import assert from 'node:assert/strict';
import { ackStatus, sharedFields, ambulanceBrief, responseLog, CONSENT_KEYS } from './commandView.js';

const T0 = Date.parse('2026-11-15T10:00:00Z');
const at = (s) => new Date(T0 + s * 1000).toISOString();
const base = (over = {}) => ({ emergency_id: 'E1', created_at: at(0), state: 'SOS_SENT', status_events: [{ state: 'SOS_SENT', timestamp: at(0) }], ...over });

// ---- ackStatus
test('an alert nobody has acknowledged is "waiting" and says for how long', () => {
  assert.deepEqual(ackStatus(base(), T0 + 12_000), { kind: 'waiting', by: null, at: null, waited: 12 });
});
test('an acknowledged alert names who and when, and the wait is alert to acknowledgement (not to now)', () => {
  const e = base({ state: 'AMBULANCE_DISPATCHED', status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(9), actor: 'Desk Staff' }, { state: 'AMBULANCE_DISPATCHED', timestamp: at(30) }] });
  assert.deepEqual(ackStatus(e, T0 + 600_000), { kind: 'acknowledged', by: 'Desk Staff', at: at(9), waited: 9 });
});
test('an acknowledgement with no actor says no name instead of inventing one', () => {
  const e = base({ state: 'HOSPITAL_ACKNOWLEDGED', status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(4) }] });
  assert.equal(ackStatus(e).by, null);
});
test('an escalated alert is "escalated" with the wait since the alert so far', () => {
  const e = base({ state: 'ESCALATED', status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'ESCALATED', timestamp: at(30) }] });
  assert.deepEqual(ackStatus(e, T0 + 45_000), { kind: 'escalated', by: null, at: null, waited: 45 });
});
test('the wait counts from the LAST alert time when the SOS event repeats', () => {
  const e = base({ status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'SOS_SENT', timestamp: at(30) }] });
  assert.equal(ackStatus(e, T0 + 40_000).waited, 10);
});
test('a cancelled alert that nobody acknowledged is "cancelled"; an early notice is "early"', () => {
  assert.equal(ackStatus(base({ state: 'CANCELLED', status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'CANCELLED', timestamp: at(5) }] })).kind, 'cancelled');
  assert.equal(ackStatus(base({ state: 'SYMPTOMS_REPORTED', status_events: [] })).kind, 'early');
});
test('a cancelled alert that WAS acknowledged still shows the acknowledgement', () => {
  const e = base({ state: 'CANCELLED', status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(3), actor: 'A' }, { state: 'CANCELLED', timestamp: at(8) }] });
  assert.equal(ackStatus(e).kind, 'acknowledged');
});
test('a bad timestamp gives null, never NaN', () => {
  const e = base({ created_at: 'junk', status_events: [] });
  assert.equal(ackStatus(e, T0).waited, null);
});

// ---- sharedFields
test('the four consent kinds are listed in a fixed order', () => assert.deepEqual(CONSENT_KEYS, ['location', 'history', 'vitals', 'reports']));
test('true and false are shown as they are', () => {
  const out = sharedFields({ consents: { location: true, history: false, vitals: true, reports: false } });
  assert.deepEqual(out.map((f) => f.shared), [true, false, true, false]);
});
test('a consent the server did not send is null (unknown), never "shared"', () => {
  assert.deepEqual(sharedFields({}).map((f) => f.shared), [null, null, null, null]);
  assert.deepEqual(sharedFields({ consents: { location: true } }).map((f) => f.shared), [true, null, null, null]);
  assert.deepEqual(sharedFields({ consents: { location: 'yes', vitals: 1 } }).map((f) => f.shared), [null, null, null, null]);
});

// ---- ambulanceBrief
test('no ambulance: not assigned, no ETA', () => {
  assert.deepEqual(ambulanceBrief(base()), { assigned: false, id: null, status: null, etaSeconds: null, simulated: true });
});
test('dispatched and en route show the ETA the backend sent; it is always marked simulated', () => {
  const e = base({ state: 'EN_ROUTE', ambulance_id: 'AMB-1', ambulance: { eta_seconds: 54 } });
  assert.deepEqual(ambulanceBrief(e), { assigned: true, id: 'AMB-1', status: 'en_route', etaSeconds: 54, simulated: true });
  assert.equal(ambulanceBrief(base({ state: 'AMBULANCE_DISPATCHED', ambulance_id: 'AMB-1' })).etaSeconds, null);
});
test('the ETA can also sit on the emergency itself', () => {
  assert.equal(ambulanceBrief(base({ state: 'EN_ROUTE', ambulance_id: 'A', eta_seconds: 70 })).etaSeconds, 70);
});
test('arrived means ETA 0; a missing ETA is null not 0 while on the way', () => {
  assert.equal(ambulanceBrief(base({ state: 'ARRIVED', ambulance_id: 'A' })).etaSeconds, 0);
  assert.equal(ambulanceBrief(base({ state: 'EN_ROUTE', ambulance_id: 'A', ambulance: { eta_seconds: null } })).etaSeconds, null);
});

// ---- responseLog
test('state changes, notes and checklist ticks come out in time order', () => {
  const e = base({
    state: 'HOSPITAL_ACKNOWLEDGED',
    status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(10), actor: 'Desk' }, { state: 'NOTE', kind: 'desk', note: 'Cath lab told', timestamp: at(20), actor: 'Desk' }],
    checklist: { ecg: { done: true, by: 'Nurse', at: at(15) } },
  });
  const log = responseLog(e, [{ id: 'ecg', label: '12-lead ECG ready' }]);
  assert.deepEqual(log.map((r) => r.kind), ['state', 'state', 'check', 'note']);
  assert.deepEqual(log.map((r) => r.at), [at(0), at(10), at(15), at(20)]);
  assert.deepEqual(log[2], { at: at(15), kind: 'check', item: 'ecg', label: '12-lead ECG ready', done: true, by: 'Nurse' });
  assert.equal(log[3].text, 'Cath lab told');
});
test('an unticked item is logged as not done; an item with no known label keeps its id', () => {
  const log = responseLog(base({ checklist: { x1: { done: false, by: 'A', at: at(5) } } }), []);
  assert.deepEqual([log[1].label, log[1].done], ['x1', false]);
});
test('events with a bad time and ticks that never happened are left out, nothing throws', () => {
  const e = base({ status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'NOTE', note: 'x', timestamp: 'junk' }], checklist: { a: null, b: { done: true, at: 'junk' }, c: {} } });
  assert.equal(responseLog(e).length, 1);
  assert.deepEqual(responseLog({}), []);
});
test('rows with the same time keep their original order', () => {
  const e = base({ status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'NOTE', note: 'first', timestamp: at(5) }, { state: 'NOTE', note: 'second', timestamp: at(5) }] });
  assert.deepEqual(responseLog(e).slice(1).map((r) => r.text), ['first', 'second']);
});
test('a note saved on this screen only is marked local', () => {
  const e = base({ status_events: [{ state: 'SOS_SENT', timestamp: at(0) }, { state: 'NOTE', kind: 'handover', note: 'n', timestamp: at(2), local_only: true }] });
  assert.equal(responseLog(e)[1].local, true);
});
test('the input is not changed', () => {
  const e = base({ checklist: { a: { done: true, by: 'x', at: at(3) } } });
  const copy = JSON.stringify(e);
  responseLog(e); ackStatus(e); sharedFields(e); ambulanceBrief(e);
  assert.equal(JSON.stringify(e), copy);
});
