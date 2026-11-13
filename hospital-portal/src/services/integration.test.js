// A REAL run of Jehal's mock server (branch Jehal, mock-server, saved in jehal-fixture.json) fed through
// the adapters, the reducer, the ranking and the report. If Jehal changes his output, re-capture the file
// (see docs/RUN_BOTH_APPS.md) and this test shows exactly what the portal can no longer read.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyEvent, mergeDetails, sortForQueue, countUnread } from './emergencyReducer.js';
import { normaliseEvent, normaliseEmergency, normaliseHospitals, defaultHospitalId, originFor } from './adapters.js';
import { rankHospitals } from './ranking.js';
import { buildReport, reportToText } from './report.js';
import { isEarly } from './stateMachine.js';

const fx = JSON.parse(fs.readFileSync(new URL('./jehal-fixture.json', import.meta.url)));
const data = (n) => JSON.parse(fs.readFileSync(new URL(`../data/${n}`, import.meta.url)));
const config = data('ranking-config.json');
const checklists = data('checklists.json');
const { heart, fallCancelled, inactivitySos } = fx.ids;
const hospitals = normaliseHospitals(fx.hospitals);

const replay = (events) => events.reduce((list, raw) => applyEvent(list, normaliseEvent(raw)), []);
const by = (list, id) => list.find((e) => e.emergency_id === id);

test('fixture is real: events carry both `event` and `type`, and ids are the mock\'s own style', () => {
  const sample = fx.events[0];
  assert.equal(sample.event, sample.type);
  assert.match(heart, /^em_\d+$/);
  assert.ok(hospitals.every((h) => /^hosp_\d+$/.test(h.id)));
});

test('replaying every real event: the heart emergency ends HANDOVER_DONE or EN_ROUTE with a full readable timeline', () => {
  const list = replay(fx.events);
  const e = by(list, heart);
  assert.ok(['EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE'].includes(e.state), e.state);
  assert.deepEqual(e.status_events.slice(0, 5).map((s) => s.state), ['EMERGENCY_DETECTED', 'SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE']);
  assert.deepEqual(e.symptoms, ['Chest pain', 'Shortness of breath', 'Sweating']);
  assert.equal(e.alerted_hospital_id, 'hosp_001');
  assert.equal(e.alerted_hospital_name, 'Demo Heart Care Hospital');
  assert.equal(e.patient_id, null); // the real created event has no patient: shown as Not shared
  assert.equal(e.location, null);
  assert.equal(e.vitals.heart_rate > 0, true); // taken from reasons.inputs.vitals
  assert.equal(e.ambulance_id, 'amb_001');
  assert.equal(typeof e.ambulance.heading, 'number'); // computed here, Jehal does not send it
  assert.ok(e.ambulance.progress >= 0 && e.ambulance.progress <= 1);
});

test('real check-in cancelled early ends CANCELLED without ever being acknowledgeable', () => {
  const list = replay(fx.events);
  const e = by(list, fallCancelled);
  assert.equal(e.state, 'CANCELLED');
  assert.equal(e.type, 'UNKNOWN');
  assert.equal(e.source, 'FALL_CHECK');
  assert.deepEqual(e.status_events.map((s) => s.state), ['EMERGENCY_DETECTED', 'CANCELLED']);
});

test('real check-in that sends SOS becomes a normal alert and reaches acknowledged', () => {
  const list = replay(fx.events);
  const e = by(list, inactivitySos);
  assert.equal(e.source, 'INACTIVITY_CHECK');
  assert.equal(isEarly(e.state), false);
  assert.ok(e.status_events.some((s) => s.state === 'SOS_SENT'));
  assert.ok(e.status_events.some((s) => s.state === 'HOSPITAL_ACKNOWLEDGED'));
});

test('real events: only the open ones are unread, and the queue puts cancelled last', () => {
  const list = replay(fx.events);
  assert.equal(sortForQueue(list).at(-1).emergency_id, fallCancelled);
  assert.ok(countUnread(list) >= 1);
});

test('merging the real GET /emergencies/{id} gives location, hospital and ambulance without wiping the live data', () => {
  let list = replay(fx.events);
  const before = by(list, heart).ambulance;
  list = mergeDetails(list, { ...normaliseEmergency(fx.details[heart]), emergency_id: heart });
  const e = by(list, heart);
  assert.deepEqual([e.location.lat, e.location.lng], [21.1702, 72.8311]);
  assert.equal(e.alerted_hospital_id, 'hosp_001');
  assert.equal(e.ambulance.id, 'amb_001');
  assert.equal(e.ambulance.heading, before.heading); // the live fields survive the merge
  assert.equal(e.patient_id, 'pat_001');
});

test('ranking on the real hospital list: capability first, then score; a closed or unverified hospital never wins', () => {
  const origin = originFor({ location: fx.details[heart].location }, hospitals);
  const heartRank = rankHospitals(hospitals, 'HEART', origin, config);
  assert.deepEqual(heartRank.ranked.map((r) => r.hospital.id), ['hosp_001']); // the only verified hospital with a cath lab
  const unknown = rankHospitals(hospitals, 'UNKNOWN', origin, config);
  assert.ok(unknown.ranked.length >= 2); // emergency department only
  assert.ok(unknown.ranked.every((r) => r.hospital.verified));
  assert.ok(unknown.ruledOut.some((r) => r.hospital.id === 'hosp_005' && r.reason === 'Not verified'));
  const asthma = rankHospitals(hospitals, 'ASTHMA', origin, config);
  assert.notEqual(asthma.ranked[0].hospital.id, 'hosp_004'); // the chest institute says available:false, so it can never be first
  assert.match(asthma.ranked.find((r) => r.hospital.id === 'hosp_004').why, /ICU not ready/);
  assert.equal(defaultHospitalId(hospitals, null), hospitals.find((h) => h.verified).id);
});

test('post-event report from the real heart case (captured while en route): readable, with the real hospital and no crash on missing data', () => {
  const detail = { ...normaliseEmergency(fx.details[heart]), emergency_id: heart };
  const e = { ...detail, created_at: detail.status_events[0].timestamp };
  const r = buildReport(e, { hospitals, rankingConfig: config, checklists, ambulances: [] });
  assert.equal(r.type_label, 'Heart attack');
  assert.equal(r.hospital.id, 'hosp_001');
  assert.equal(r.hospital.position, 1);
  assert.equal(r.outcome, 'Still open (not finished)'); // the fixture was captured while the ambulance was en route
  const done = buildReport({ ...e, state: 'HANDOVER_DONE', status_events: [...e.status_events, { state: 'HANDOVER_DONE', timestamp: '2099-01-01T00:00:00Z' }] }, { hospitals, rankingConfig: config, checklists, ambulances: [] });
  assert.equal(done.outcome, 'Handed over to the hospital team');
  assert.deepEqual(r.symptoms, ['Chest pain', 'Shortness of breath', 'Sweating']);
  assert.ok(r.timeline.length >= 5);
  assert.match(reportToText(r), /Heart attack/);
});

test('post-event report for the real early-cancelled check-in: says it ended before the SOS and has no patient or vitals', () => {
  const detail = { ...normaliseEmergency(fx.details[fallCancelled]), emergency_id: fallCancelled };
  const e = { ...detail, created_at: detail.status_events[0].timestamp };
  const r = buildReport(e, { hospitals, rankingConfig: config, checklists, ambulances: [] });
  assert.equal(r.outcome, 'Cancelled by the patient before the SOS was sent');
  assert.equal(r.cancelled_early, true);
  assert.match(r.origin, /Simulated/);
  assert.match(reportToText(r), /Started by:/);
  assert.equal(r.hospital, null);
  assert.equal(r.checklist.total, 4); // the UNKNOWN checklist
});

test('post-event report for the real check-in with SOS keeps working', () => {
  const detail = { ...normaliseEmergency(fx.details[inactivitySos]), emergency_id: inactivitySos };
  const e = { ...detail, created_at: detail.status_events[0].timestamp };
  const r = buildReport(e, { hospitals, rankingConfig: config, checklists, ambulances: [] });
  assert.equal(r.type, 'UNKNOWN');
  assert.ok(r.timeline.length >= 3);
});
