import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateHospital, emptyHospitalForm, formFromHospital } from './hospitalForm.js';
import { rankHospitals } from './ranking.js';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../data/${n}`, import.meta.url)));
const good = () => ({ ...emptyHospitalForm(), name: 'Test Care Hospital (Sample)', address: 'Sample road, Ahmedabad', phone: '+91-79-0000-0099', lat: '23.05', lng: '72.60',
  capabilities: { cath_lab: true, stroke_unit: false, icu: true, emergency: true }, availability: { beds_free: '5', icu_free: '1', cath_lab_ready: true, stroke_unit_ready: false } });

test('a complete form is accepted and cleaned into numbers', () => {
  const r = validateHospital(good());
  assert.equal(r.ok, true);
  assert.equal(r.value.lat, 23.05);
  assert.equal(r.value.availability.beds_free, 5);
  assert.equal(r.value.verified, undefined); // verification is never set by the form
});

test('every required field is checked', () => {
  const r = validateHospital(emptyHospitalForm());
  assert.equal(r.ok, false);
  for (const f of ['name', 'address', 'phone', 'lat', 'lng']) assert.ok(r.errors[f], f);
});

test('bad numbers and ranges are rejected', () => {
  const f = good();
  assert.ok(validateHospital({ ...f, lat: '91' }).errors.lat);
  assert.ok(validateHospital({ ...f, lng: '-181' }).errors.lng);
  assert.ok(validateHospital({ ...f, lat: 'abc' }).errors.lat);
  assert.ok(validateHospital({ ...f, availability: { ...f.availability, beds_free: '-1' } }).errors.beds_free);
  assert.ok(validateHospital({ ...f, availability: { ...f.availability, beds_free: '2.5' } }).errors.beds_free);
  assert.ok(validateHospital({ ...f, phone: 'abc' }).errors.phone);
  assert.ok(validateHospital({ ...f, name: 'ab' }).errors.name);
});

test('a unit cannot be ready if the hospital does not have it', () => {
  const f = good();
  assert.ok(validateHospital({ ...f, availability: { ...f.availability, stroke_unit_ready: true } }).errors.stroke_unit_ready);
  assert.ok(validateHospital({ ...f, capabilities: { ...f.capabilities, cath_lab: false } }).errors.cath_lab_ready);
});

test('at least one capability is needed', () => {
  const f = good();
  assert.ok(validateHospital({ ...f, capabilities: { cath_lab: false, stroke_unit: false, icu: false, emergency: false }, availability: { ...f.availability, cath_lab_ready: false } }).errors.capabilities);
});

test('edit form round trip keeps the values', () => {
  const h = load('hospitals.json')[1];
  const r = validateHospital(formFromHospital(h));
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.value.capabilities.stroke_unit, true);
});

test('an unverified hospital is never ranked, even if it is the best and nearest', () => {
  const config = load('ranking-config.json');
  const hospitals = load('hospitals.json');
  const best = { ...hospitals[1], id: 'H9', name: 'New unverified', verified: false, lat: 23.0226, lng: 72.5715 };
  const out = rankHospitals([...hospitals, best], 'HEART', { lat: 23.0225, lng: 72.5714 }, config);
  assert.ok(!out.ranked.some((r) => r.hospital.id === 'H9'));
  assert.equal(out.ruledOut.find((r) => r.hospital.id === 'H9').reason, 'Not verified');
  const after = rankHospitals([...hospitals, { ...best, verified: true }], 'HEART', { lat: 23.0225, lng: 72.5714 }, config);
  assert.ok(after.ranked.some((r) => r.hospital.id === 'H9'));
});
