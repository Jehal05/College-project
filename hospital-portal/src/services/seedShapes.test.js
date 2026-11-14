// The sample alerts and sample history must have the shape the portal expects, and must survive the adapter unchanged
// in meaning (normaliseEmergency is what real backend data goes through, so the mock data should go through it too).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normaliseEmergency } from './adapters.js';
import { normalise, applyEvent } from './emergencyReducer.js';
import { EMERGENCY_STATES, EXTRA_STATES, EMERGENCY_TYPES, EXTRA_TYPES, SEVERITY } from './contract.js';

const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'));
const alerts = load('mock-alerts.json');
const history = load('sample-history.json');
const hospitals = load('hospitals.json');
const ambulances = load('ambulances.json');

const STATES = [...EMERGENCY_STATES, ...EXTRA_STATES];
const TYPES = [...EMERGENCY_TYPES, ...EXTRA_TYPES];
const hospitalIds = new Set(hospitals.map((h) => h.id));
const ambulanceIds = new Set(ambulances.map((a) => a.id));
const all = [...alerts.map((a) => ['mock alert', a]), ...history.map((h) => ['sample history', h])];

test('seed lists are not empty and ids are unique', () => {
  assert.ok(alerts.length >= 3);
  assert.ok(history.length >= 5);
  const ids = [...alerts, ...history].map((e) => e.emergency_id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const [kind, rec] of all) {
  test(`${kind} ${rec.emergency_id}: has the required fields with legal values`, () => {
    assert.equal(typeof rec.emergency_id, 'string');
    assert.ok(STATES.includes(rec.state), `state ${rec.state}`);
    assert.ok(TYPES.includes(rec.type), `type ${rec.type}`);
    assert.ok(SEVERITY.includes(rec.severity), `severity ${rec.severity}`);
    assert.ok(Number.isFinite(Date.parse(rec.created_at)), 'created_at is a date');
    assert.ok(Array.isArray(rec.symptoms) && rec.symptoms.every((s) => typeof s === 'string'));
    assert.ok(Math.abs(rec.location.lat) <= 90 && Math.abs(rec.location.lng) <= 180, 'location is a real coordinate');
    assert.ok(rec.vitals && ['heart_rate', 'spo2', 'bp'].every((k) => k in rec.vitals));
    if (rec.alerted_hospital_id) assert.ok(hospitalIds.has(rec.alerted_hospital_id), `hospital ${rec.alerted_hospital_id} exists`);
    if (rec.ambulance_id) assert.ok(ambulanceIds.has(rec.ambulance_id), `ambulance ${rec.ambulance_id} exists`);
  });

  test(`${kind} ${rec.emergency_id}: normaliseEmergency keeps meaning, adds safe defaults and is stable`, () => {
    const n = normaliseEmergency(rec);
    assert.equal(n.emergency_id, rec.emergency_id);
    assert.equal(n.type, rec.type);
    assert.equal(n.severity, rec.severity);
    assert.equal(n.state, rec.state);
    assert.deepEqual(n.symptoms, rec.symptoms, 'symptom words pass through the adapter unchanged');
    assert.deepEqual(n.location && { lat: n.location.lat, lng: n.location.lng }, { lat: rec.location.lat, lng: rec.location.lng });
    assert.equal(n.vitals.heart_rate, rec.vitals.heart_rate);
    assert.equal(n.simulated, true, 'everything is marked simulated');
    assert.deepEqual(normaliseEmergency(n), n, 'running it twice changes nothing');
  });

  test(`${kind} ${rec.emergency_id}: works in the reducer`, () => {
    const n = normalise(normaliseEmergency(rec));
    assert.ok(n.status_events.length >= 1);
    assert.ok(Array.isArray(n.alerted_ids));
    // Replaying it as an emergency.created event adds exactly one card
    const list = applyEvent([], { event: 'emergency.created', emergency_id: rec.emergency_id, state: rec.state, timestamp: rec.created_at, payload: rec });
    assert.equal(list.length, 1);
    assert.equal(list[0].emergency_id, rec.emergency_id);
  });
}

for (const rec of history) {
  test(`sample history ${rec.emergency_id}: finished, with an ordered timeline that ends in its state`, () => {
    assert.ok(['HANDOVER_DONE', 'CANCELLED'].includes(rec.state), `history is finished, not ${rec.state}`);
    assert.equal(rec.sample, true, 'marked as sample');
    const times = rec.status_events.map((s) => Date.parse(s.timestamp));
    assert.ok(times.every(Number.isFinite));
    assert.deepEqual([...times].sort((a, b) => a - b), times, 'timeline is in time order');
    assert.equal(rec.status_events.at(-1).state, rec.state);
    assert.ok(Date.parse(rec.created_at) <= times[0] + 1000, 'case starts before its first event');
  });
}

test('checklist ticks in the sample history use known by/at fields', () => {
  for (const rec of history) {
    for (const [item, tick] of Object.entries(rec.checklist || {})) {
      assert.equal(typeof tick.done, 'boolean', `${rec.emergency_id} ${item}`);
      if (tick.done) assert.ok(tick.by && Number.isFinite(Date.parse(tick.at)), `${rec.emergency_id} ${item} says who and when`);
    }
  }
});
