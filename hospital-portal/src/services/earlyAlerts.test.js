import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyEvent, sortForQueue, countUnread, shouldAlertSound } from './emergencyReducer.js';
import { normaliseEvent } from './adapters.js';
import { canTransition, whyNot, isEarly } from './stateMachine.js';
import { rankHospitals } from './ranking.js';
import { normaliseHospitals } from './adapters.js';

const config = JSON.parse(fs.readFileSync(new URL('../data/ranking-config.json', import.meta.url)));
const feed = (list, raw) => applyEvent(list, normaliseEvent(raw));
const created = (id, state, extra = {}) => ({ event: 'emergency.created', emergency_id: id, state, timestamp: '2026-11-13T10:00:00Z', payload: { type: 'HEART', severity: 'EMERGENCY', symptoms: ['CHEST_PAIN'], ...extra } });
const ev = (event, id, state, payload = {}) => ({ event, emergency_id: id, state, timestamp: '2026-11-13T10:00:05Z', payload });

// Decision A: the backend creates the alert early (EMERGENCY_DETECTED) and moves it to SOS_SENT later.
test('early alert: shown, but not unread, not new (no flash), no sound, not acknowledgeable', () => {
  let list = [];
  const msg = normaliseEvent(created('e1', 'EMERGENCY_DETECTED'));
  assert.equal(shouldAlertSound(list, msg), false);
  list = applyEvent(list, msg);
  assert.equal(list.length, 1);
  assert.equal(list[0]._new, false);
  assert.equal(countUnread(list), 0);
  assert.equal(isEarly(list[0].state), true);
  assert.equal(canTransition('EMERGENCY_DETECTED', 'HOSPITAL_ACKNOWLEDGED'), false);
  assert.match(whyNot('EMERGENCY_DETECTED', 'HOSPITAL_ACKNOWLEDGED'), /not reached the hospital/);
  assert.equal(list[0].status_events[0].state, 'EMERGENCY_DETECTED');
});
test('early alert then SOS_SENT: now it is new, unread and plays the sound once', () => {
  let list = feed([], created('e1', 'EMERGENCY_DETECTED'));
  const sos = normaliseEvent(ev('emergency.sos_sent', 'e1', 'SOS_SENT'));
  assert.equal(shouldAlertSound(list, sos), true);
  list = applyEvent(list, sos);
  assert.equal(list[0].state, 'SOS_SENT');
  assert.equal(list[0]._new, true);
  assert.equal(countUnread(list), 1);
  assert.equal(canTransition(list[0].state, 'HOSPITAL_ACKNOWLEDGED'), true);
  assert.equal(shouldAlertSound(list, sos), false); // a repeated event is silent
});
test('early alert cancelled: calm. No sound, no flash, ends as CANCELLED, never counted as unread', () => {
  let list = feed([], created('e1', 'EMERGENCY_DETECTED'));
  const cancel = normaliseEvent(ev('emergency.cancelled', 'e1', 'CANCELLED'));
  assert.equal(shouldAlertSound(list, cancel), false);
  list = applyEvent(list, cancel);
  assert.equal(list[0].state, 'CANCELLED');
  assert.equal(list[0]._new, false);
  assert.equal(countUnread(list), 0);
  assert.deepEqual(list[0].status_events.map((s) => s.state), ['EMERGENCY_DETECTED', 'CANCELLED']);
});
// Decision B: the backend creates the alert straight at SOS_SENT.
test('alert created straight at SOS_SENT behaves as before: new, unread, sound', () => {
  const msg = normaliseEvent(created('e2', 'SOS_SENT'));
  assert.equal(shouldAlertSound([], msg), true);
  const list = applyEvent([], msg);
  assert.equal(list[0]._new, true);
  assert.equal(countUnread(list), 1);
});
test('non-EMERGENCY severity never plays the sound', () => {
  assert.equal(shouldAlertSound([], normaliseEvent(created('e3', 'SOS_SENT', { severity: 'URGENT' }))), false);
});
test('queue order: open alerts, then early notices, then closed ones', () => {
  let list = [];
  list = feed(list, created('closed', 'SOS_SENT'));
  list = feed(list, ev('emergency.cancelled', 'closed', 'CANCELLED'));
  list = feed(list, created('early', 'EMERGENCY_DETECTED'));
  list = feed(list, created('open', 'SOS_SENT', { severity: 'WATCH' }));
  assert.deepEqual(sortForQueue(list).map((e) => e.emergency_id), ['open', 'early', 'closed']);
});
test('acknowledged event cannot be applied to a cancelled alert, and a cancelled one never reopens', () => {
  let list = feed([], created('e1', 'EMERGENCY_DETECTED'));
  list = feed(list, ev('emergency.cancelled', 'e1', 'CANCELLED'));
  list = feed(list, ev('hospital.acknowledged', 'e1', 'HOSPITAL_ACKNOWLEDGED'));
  assert.equal(list[0].state, 'CANCELLED');
});
test('safety check-in alert (UNKNOWN, no symptoms) is stored with readable origin data and no crash on missing fields', () => {
  const list = feed([], { event: 'emergency.created', emergency_id: 'c1', state: 'EMERGENCY_DETECTED', timestamp: '2026-11-13T10:00:00Z', payload: { type: 'UNKNOWN', severity: 'EMERGENCY', symptoms: [], source: 'FALL_CHECK' } });
  const e = list[0];
  assert.equal(e.type, 'UNKNOWN');
  assert.deepEqual(e.symptoms, []);
  assert.equal(e.patient_id, null);
  assert.equal(e.location, null);
  assert.equal(e.vitals, null);
});
test('ambulance.location with only lat/lng/eta fills heading and progress in the stored emergency', () => {
  let list = feed([], created('e1', 'SOS_SENT'));
  list = feed(list, ev('hospital.acknowledged', 'e1', 'HOSPITAL_ACKNOWLEDGED'));
  list = feed(list, ev('ambulance.dispatched', 'e1', 'AMBULANCE_DISPATCHED', { ambulance_id: 'amb_001', eta_seconds: 60 }));
  list = feed(list, ev('ambulance.location', 'e1', 'EN_ROUTE', { ambulance_id: 'amb_001', lat: 21.17, lng: 72.83, eta_seconds: 60 }));
  list = feed(list, ev('ambulance.location', 'e1', 'EN_ROUTE', { ambulance_id: 'amb_001', lat: 21.18, lng: 72.83, eta_seconds: 30 }));
  assert.equal(list[0].state, 'EN_ROUTE');
  assert.equal(list[0].ambulance.heading, 0);
  assert.equal(list[0].ambulance.progress, 0.5);
});

// ---- ranking for UNKNOWN: emergency department only
test('UNKNOWN ranks by emergency department only: a hospital without cath lab or stroke unit is not ruled out', () => {
  const hospitals = normaliseHospitals([
    { id: 'hosp_003', name: 'General', lat: 21.185, lng: 72.812, capabilities: ['EMERGENCY', 'ICU'], available: true, verified: true },
    { id: 'hosp_005', name: 'Community', lat: 21.21, lng: 72.865, capabilities: ['EMERGENCY'], available: true, verified: false },
    { id: 'hosp_x', name: 'Clinic', lat: 21.2, lng: 72.8, capabilities: ['ICU'], available: true, verified: true },
  ]);
  const r = rankHospitals(hospitals, 'UNKNOWN', { lat: 21.17, lng: 72.83 }, config);
  assert.deepEqual(r.required, ['emergency']);
  assert.deepEqual(r.ranked.map((x) => x.hospital.id), ['hosp_003']);
  assert.deepEqual(r.ruledOut.map((x) => [x.hospital.id, x.reason]).sort(), [['hosp_5'.replace('5', '005'), 'Not verified'], ['hosp_x', 'No emergency department']].sort());
  // The same hospitals for HEART: the general hospital has no cath lab, so nobody qualifies.
  assert.equal(rankHospitals(hospitals, 'HEART', { lat: 21.17, lng: 72.83 }, config).ranked.length, 0);
});
test('ranking works when bed numbers are not shared and when no patient location is known', () => {
  const hospitals = normaliseHospitals([{ id: 'a', lat: 21, lng: 72, capabilities: ['EMERGENCY', 'ICU'], available: true, verified: true }]);
  const r = rankHospitals(hospitals, 'ASTHMA', null, config);
  assert.equal(r.ranked.length, 1);
  assert.match(r.ranked[0].why, /bed numbers not shared/);
  assert.match(r.ranked[0].why, /travel time unknown/);
  const closed = normaliseHospitals([{ id: 'b', lat: 21, lng: 72, capabilities: ['EMERGENCY', 'ICU'], available: false, verified: true }]);
  assert.match(rankHospitals(closed, 'ASTHMA', null, config).ranked[0].why, /ICU not ready/);
});
