// Each demo patient has their own simulated wearable. Offline: no express, no server.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');
const fakeExpress = { Router: () => { const r = {}; for (const m of ['get', 'post', 'delete', 'patch', 'put', 'use']) r[m] = () => {}; return r; } };
const orig = Module._load;
Module._load = function (req, ...a) { return req === 'express' ? fakeExpress : orig.call(this, req, ...a); };
const vitals = require('../vitals');
const store = require('../store');
const simulator = require('../simulator');
const otherApps = require('../otherApps');
Module._load = orig;

const known = (id) => Boolean(store.patients[id]);
const AMIT = 'PT-2026-0417', PRIYA = 'PT-2026-0418';
const hr = (id) => vitals.currentVitals(id).heart_rate;

test('a heart emergency for Amit changes only Amit', () => {
  vitals.reset();
  const r = vitals.applyChange({ patient_id: AMIT, profile: 'heart_attack' }, known);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.patient_id, AMIT);
  for (let i = 0; i < 20; i++) { assert.ok(hr(AMIT) >= 135 && hr(AMIT) <= 150); assert.ok(hr(PRIYA) <= 76); }
  assert.strictEqual(vitals.profileOf(AMIT), 'heart_attack');
  assert.strictEqual(vitals.profileOf(PRIYA), 'normal');
});

test('the alert uses the vitals of the patient who sent it, and nothing without the vitals consent', () => {
  vitals.reset();
  vitals.applyChange({ patient_id: PRIYA, profile: 'heart_attack' }, known);
  const priya = simulator.createEmergency({ patient_id: PRIYA, type: 'HEART', symptoms: ['chest_pain'], source: 'MANUAL' });
  const amit = simulator.createEmergency({ patient_id: AMIT, type: 'HEART', symptoms: ['chest_pain'], source: 'MANUAL' });
  assert.ok(priya.vitals_at_alert.heart_rate >= 135);
  assert.ok(amit.vitals_at_alert.heart_rate <= 76);
  const hidden = simulator.createEmergency({ patient_id: PRIYA, type: 'HEART', symptoms: ['chest_pain'], consents: { vitals: false }, source: 'MANUAL' });
  assert.strictEqual(hidden.vitals_at_alert, null);
  simulator.stopAll();
});

test('unknown patient and unknown profile are refused and change nothing', () => {
  vitals.reset();
  assert.strictEqual(vitals.applyChange({ patient_id: 'PT-0000-0000', profile: 'heart_attack' }, known).status, 404);
  assert.strictEqual(vitals.applyChange({ patient_id: AMIT, profile: 'nonsense' }, known).status, 400);
  assert.strictEqual(vitals.profileOf(AMIT), 'normal');
});

test('without a patient the default changes (older callers), and reset puts everyone back to resting', () => {
  vitals.reset();
  vitals.applyChange({ profile: 'asthma' }, known);
  assert.strictEqual(vitals.profileOf(PRIYA), 'asthma', 'default applies to patients without their own profile');
  vitals.applyChange({ patient_id: AMIT, profile: 'heart_attack' }, known);
  assert.strictEqual(vitals.profileOf(AMIT), 'heart_attack');
  vitals.reset();
  assert.strictEqual(vitals.profileOf(AMIT), 'normal');
  assert.strictEqual(vitals.profileOf(PRIYA), 'normal');
  assert.deepStrictEqual(vitals.snapshot().patients, {});
});

test('overrides stay with the patient they were set for', () => {
  vitals.reset();
  vitals.applyChange({ patient_id: AMIT, overrides: { heart_rate: 199 } }, known);
  assert.strictEqual(hr(AMIT), 199);
  assert.notStrictEqual(hr(PRIYA), 199);
  vitals.reset();
});

test('a patient phone hears only its own vitals', () => {
  const ev = { type: 'vitals.update', emergency_id: null, payload: { patient_id: AMIT } };
  assert.strictEqual(otherApps.filterFor({ role: 'PATIENT', patient_id: AMIT }, ev), ev);
  assert.strictEqual(otherApps.filterFor({ role: 'PATIENT', patient_id: PRIYA }, ev), null);
  assert.strictEqual(otherApps.filterFor({ role: 'HOSPITAL_STAFF' }, ev), ev);
});
