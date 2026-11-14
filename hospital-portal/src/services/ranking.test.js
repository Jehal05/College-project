import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rankHospitals } from './ranking.js';
import { secondsLeft, fallbackStatuses, nextHospital } from './escalation.js';

const load = (name) => JSON.parse(fs.readFileSync(new URL(`../data/${name}`, import.meta.url)));
const hospitals = load('hospitals.json');
const config = load('ranking-config.json');
const PATIENT = { lat: 23.0225, lng: 72.5714 }; // demo location; H1 is the nearest hospital
const ids = (rows) => rows.map((r) => r.hospital.id);

test('stroke: a stroke-unit hospital is chosen over a nearer hospital without one', () => {
  const { ranked, ruledOut } = rankHospitals(hospitals, 'STROKE', PATIENT, config);
  assert.equal(ranked[0].hospital.capabilities.stroke_unit, true);
  assert.ok(ranked.every((r) => r.hospital.capabilities.stroke_unit));
  const h1 = ruledOut.find((r) => r.hospital.id === 'H1');
  assert.equal(h1.reason, 'No stroke unit');
  assert.ok(!ids(ranked).includes('H1'), 'the nearest hospital is ruled out, not ranked low');
});

test('heart: only cath-lab hospitals are ranked', () => {
  const { ranked, ruledOut } = rankHospitals(hospitals, 'HEART', PATIENT, config);
  assert.deepEqual(ids(ranked).sort(), ['H2', 'H3']);
  assert.equal(ruledOut.length, 3);
});

test('distance alone never wins: a far capable hospital beats a near incapable one', () => {
  const near = { id: 'NEAR', verified: true, lat: 23.0226, lng: 72.5715, capabilities: { emergency: true, icu: true }, availability: { beds_free: 50, icu_free: 10 } };
  const far = { id: 'FAR', verified: true, lat: 23.2, lng: 72.7, capabilities: { emergency: true, stroke_unit: true }, availability: { beds_free: 0, icu_free: 0, stroke_unit_ready: true } };
  const { ranked, ruledOut } = rankHospitals([near, far], 'STROKE', PATIENT, config);
  assert.deepEqual(ids(ranked), ['FAR']);
  assert.deepEqual(ids(ruledOut), ['NEAR']);
});

test('unverified hospitals never appear in the ranking', () => {
  const list = hospitals.map((h) => (h.id === 'H2' ? { ...h, verified: false } : h));
  const { ranked, ruledOut } = rankHospitals(list, 'STROKE', PATIENT, config);
  assert.ok(!ids(ranked).includes('H2'));
  assert.equal(ruledOut.find((r) => r.hospital.id === 'H2').reason, 'Not verified');
});

test('the score breakdown adds up to the total, and totals are 0 to 100', () => {
  for (const type of ['HEART', 'STROKE', 'DIABETIC', 'ASTHMA']) {
    for (const r of rankHospitals(hospitals, type, PATIENT, config).ranked) {
      const sum = Math.round((r.points.capability + r.points.travel_time + r.points.availability) * 10) / 10;
      assert.equal(r.total, sum, `${type} ${r.hospital.id}`);
      assert.ok(r.total >= 0 && r.total <= 100);
    }
  }
});

test('weights come from the config', () => {
  const travelOnly = { ...config, weights: { capability: 0, travel_time: 1, availability: 0 } };
  const bedsOnly = { ...config, weights: { capability: 0, travel_time: 0, availability: 1 } };
  assert.equal(rankHospitals(hospitals, 'DIABETIC', PATIENT, travelOnly).ranked[0].hospital.id, 'H1'); // nearest
  assert.equal(rankHospitals(hospitals, 'DIABETIC', PATIENT, bedsOnly).ranked[0].hospital.id, 'H3'); // most beds and ICU
});

test('changing an availability flag changes the ranking', () => {
  const before = rankHospitals(hospitals, 'STROKE', PATIENT, config).ranked;
  const top = before[0].hospital.id;
  const changed = hospitals.map((h) => (h.id === top ? { ...h, availability: { ...h.availability, stroke_unit_ready: false, beds_free: 0, icu_free: 0 } } : h));
  const after = rankHospitals(changed, 'STROKE', PATIENT, config).ranked;
  assert.notEqual(after[0].hospital.id, top);
  assert.ok(ids(after).includes(top), 'still listed, because the unit exists');
});

test('ranks are numbered from 1 and sorted best first', () => {
  const { ranked } = rankHospitals(hospitals, 'ASTHMA', PATIENT, config);
  assert.deepEqual(ranked.map((r) => r.rank), ranked.map((_, i) => i + 1));
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].total >= ranked[i].total);
});

test('empty results are handled', () => {
  assert.deepEqual(rankHospitals([], 'HEART', PATIENT, config).ranked, []);
  assert.deepEqual(rankHospitals(undefined, 'HEART', PATIENT, config).ranked, []);
  const none = rankHospitals(hospitals.filter((h) => !h.capabilities.cath_lab), 'HEART', PATIENT, config);
  assert.equal(none.ranked.length, 0);
  assert.equal(none.ruledOut.length, 3);
  assert.equal(rankHospitals(hospitals, 'HEART', null, config).ranked[0].eta_min, null);
});

// ---- escalation helpers
const em = (over = {}) => ({ state: 'SOS_SENT', created_at: '2026-11-13T08:00:00Z', status_events: [{ state: 'SOS_SENT', timestamp: '2026-11-13T08:00:00Z' }], alerted_ids: [], ...over });
const T0 = new Date('2026-11-13T08:00:00Z').getTime();

test('countdown: counts down from 30, stops at 0, and is off once acknowledged', () => {
  assert.equal(secondsLeft(em(), T0 + 18000, 30), 12);
  assert.equal(secondsLeft(em(), T0 + 45000, 30), 0);
  assert.equal(secondsLeft(em({ state: 'HOSPITAL_ACKNOWLEDGED' }), T0 + 5000, 30), null);
  assert.equal(secondsLeft(em({ state: 'CANCELLED' }), T0 + 5000, 30), null);
});

test('countdown restarts from the escalation time', () => {
  const e = em({ state: 'ESCALATED', status_events: [{ state: 'SOS_SENT', timestamp: '2026-11-13T08:00:00Z' }, { state: 'ESCALATED', timestamp: '2026-11-13T08:00:30Z' }] });
  assert.equal(secondsLeft(e, T0 + 40000, 30), 20);
});

test('fallback list: alerted, next, later; then no answer after escalation', () => {
  const { ranked } = rankHospitals(hospitals, 'ASTHMA', PATIENT, config);
  const [a, b, c] = ids(ranked);
  const first = fallbackStatuses(ranked, em({ alerted_hospital_id: a }));
  assert.equal(first[a], 'alerted');
  assert.equal(first[b], 'next');
  assert.equal(first[c], 'later');
  const second = em({ state: 'ESCALATED', alerted_ids: [a], alerted_hospital_id: b });
  const s = fallbackStatuses(ranked, second);
  assert.equal(s[a], 'no_answer');
  assert.equal(s[b], 'alerted');
  assert.equal(s[c], 'next');
  assert.equal(nextHospital(ranked, second).id, c);
  const acked = fallbackStatuses(ranked, { ...second, state: 'HOSPITAL_ACKNOWLEDGED' });
  assert.equal(acked[b], 'responding');
  assert.equal(acked[c], 'not_needed');
});

test('fallback list: no next hospital when the list is used up', () => {
  const { ranked } = rankHospitals(hospitals, 'HEART', PATIENT, config); // two hospitals
  const [a, b] = ids(ranked);
  assert.equal(nextHospital(ranked, em({ state: 'ESCALATED', alerted_ids: [a], alerted_hospital_id: b })), null);
});

test('a type with an empty capability list does not divide by zero (needs only an emergency department)', async () => {
  const { rankHospitals: rank } = await import('./ranking.js');
  const hospitals = [{ id: 'A', name: 'A', verified: true, lat: 23, lng: 72.5, capabilities: { emergency: true }, availability: { beds_free: 5, icu_free: 1 } }];
  const config = { weights: { capability: 0.5, travel_time: 0.3, availability: 0.2 }, only_verified_hospitals: true, required_capabilities: { HEART: [] } };
  const out = rank(hospitals, 'HEART', { lat: 23, lng: 72.5 }, config);
  assert.deepEqual(out.required, ['emergency']);
  assert.equal(out.ranked.length, 1);
  assert.ok(Number.isFinite(out.ranked[0].total));
});
test('a type missing from the config also needs only an emergency department', async () => {
  const { rankHospitals: rank } = await import('./ranking.js');
  const hospitals = [{ id: 'A', verified: true, capabilities: { emergency: true }, availability: {} }];
  const out = rank(hospitals, 'NOPE', { lat: 1, lng: 1 }, { weights: { capability: 0.5, travel_time: 0.3, availability: 0.2 }, required_capabilities: {} });
  assert.ok(Number.isFinite(out.ranked[0].total));
});
