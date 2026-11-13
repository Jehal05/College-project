import test from 'node:test';
import assert from 'node:assert/strict';
import { etaText, etaLine, sharedFacts, readinessCard, passportRows, passportError } from './readiness.js';

const base = { emergency_id: 'E1', state: 'SOS_SENT', type: 'HEART', patient_id: 'pat_001', symptoms: ['Chest pain', 'Sweating'], vitals: { heart_rate: 118, spo2: 94, bp: '150/95' }, location: { lat: 1, lng: 2 } };

test('ETA text', () => {
  assert.equal(etaText(45), '45 s');
  assert.equal(etaText(200), '3 min 20 s');
  assert.equal(etaText(4000), '1 h 6 min');
  assert.equal(etaText('x'), 'Not shared');
});

test('ETA line: no ambulance, not shared yet, simulated value, arrived', () => {
  assert.deepEqual(etaLine(base), { known: false, text: 'No ambulance sent yet' });
  assert.deepEqual(etaLine({ ...base, ambulance_id: 'A1' }), { known: false, text: 'ETA not shared yet' });
  assert.deepEqual(etaLine({ ...base, ambulance_id: 'A1', ambulance: { eta_seconds: 200 } }), { known: true, text: '3 min 20 s (simulated)' });
  assert.deepEqual(etaLine({ ...base, ambulance_id: 'A1', state: 'ARRIVED' }), { known: true, text: 'Arrived' });
  assert.equal(etaLine({ ...base, ambulance_id: 'A1', ambulance: { eta_seconds: null } }).known, false);
});

test('shared facts: shows what was shared and "Not shared" for the rest', () => {
  const f = Object.fromEntries(sharedFacts(base).map((x) => [x.key, x.value]));
  assert.equal(f.symptoms, 'Chest pain, Sweating');
  assert.equal(f.vitals, 'HR 118, SpO₂ 94%, BP 150/95');
  assert.equal(f.location, 'Shared');
  const none = Object.fromEntries(sharedFacts({ emergency_id: 'E2', state: 'SOS_SENT', symptoms: [] }).map((x) => [x.key, x.value]));
  assert.deepEqual(none, { patient: 'Not shared', symptoms: 'Not shared', vitals: 'Not shared', location: 'Not shared' });
  assert.equal(sharedFacts({ ...base, vitals: {} }).find((x) => x.key === 'vitals').value, 'Not shared');
});

test('readiness card: checklist progress and team', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const c = readinessCard({ ...base, checklist: { a: { done: true }, b: { done: false } }, assigned_team: { name: 'Dr A', specialty: 'Cardiology' } }, items);
  assert.equal(c.checklist.text, '1 of 3 done');
  assert.deepEqual(c.team, { assigned: true, text: 'Dr A (Cardiology)' });
  assert.equal(c.open, true);
  const empty = readinessCard(base, []);
  assert.equal(empty.checklist.text, 'No checklist for this type');
  assert.deepEqual(empty.team, { assigned: false, text: 'No one assigned yet' });
  assert.equal(readinessCard({ ...base, state: 'CANCELLED' }, items).open, false);
});

test('passport rows: omitted fields read "Not shared", an empty list that was sent reads "None recorded"', () => {
  const rows = Object.fromEntries(passportRows({ patient_id: 'pat_001', name: 'Demo Patient', age: 58, blood_group: 'B+', conditions: ['hypertension'], allergies: [], contacts: [{ name: 'Rel', order: 1 }], simulated: true }).map((r) => [r.key, r.value]));
  assert.equal(rows.name, 'Demo Patient');
  assert.equal(rows.age, '58');
  assert.equal(rows.conditions, 'hypertension');
  assert.equal(rows.allergies, 'None recorded');
  assert.equal(rows.contacts, '1 listed');
  assert.equal(rows.reports, 'Not shared'); // omitted: the patient did not consent
});

test('passport rows: an almost empty passport is all Not shared; bad input gives no rows', () => {
  const rows = passportRows({ patient_id: 'p' });
  assert.ok(rows.every((r) => r.value === 'Not shared'));
  assert.deepEqual(passportRows(null), []);
  assert.equal(passportRows({ age: 0 }).find((r) => r.key === 'age').value, '0'); // zero is a value
});

test('passport errors: 401, 403, 404 and others get plain words', () => {
  assert.equal(passportError({ status: 401 }).kind, 'login');
  assert.match(passportError({ status: 401 }).text, /Log in again/);
  assert.equal(passportError({ status: 403 }).kind, 'forbidden');
  assert.match(passportError({ status: 403 }).text, /Only hospital staff/);
  assert.equal(passportError({ status: 404 }).kind, 'not_found');
  assert.match(passportError({ status: 404 }).text, /No passport was found/);
  assert.match(passportError({ status: 500, message: 'boom' }).text, /Could not open the passport: boom/);
  assert.equal(passportError(null).kind, 'error');
});
