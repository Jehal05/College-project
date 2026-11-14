import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAvailabilityUpdate, pickAvailability } from './hospitalEvents.js';

const list = () => [
  { id: 'HSP-AMD-002', availability: { beds_free: 4, icu_free: 1, cath_lab_ready: true, stroke_unit_ready: true } },
  { id: 'HSP-AMD-003', availability: { beds_free: 2, icu_free: 0, cath_lab_ready: false, stroke_unit_ready: false } },
];

test('only the sent keys change, only for that hospital', () => {
  const next = applyAvailabilityUpdate(list(), { hospital_id: 'HSP-AMD-002', availability: { beds_free: 9 } });
  assert.equal(next[0].availability.beds_free, 9);
  assert.equal(next[0].availability.icu_free, 1);
  assert.deepEqual(next[1], list()[1]);
});

test('Daksh names are read as ours; ours win when both are sent', () => {
  const next = applyAvailabilityUpdate(list(), { hospital_id: 'HSP-AMD-003', availability: { icu_beds: 3, cath_lab_open: true, icu_free: 5 } });
  assert.equal(next[1].availability.icu_free, 5);
  assert.equal(next[1].availability.cath_lab_ready, true);
  assert.equal(next[1].availability.icu_beds, undefined);
});

test('unknown hospital, missing id or empty payload leave the list as it is', () => {
  const l = list();
  assert.equal(applyAvailabilityUpdate(l, { hospital_id: 'NOPE', availability: { beds_free: 1 } }), l);
  assert.equal(applyAvailabilityUpdate(l, { availability: { beds_free: 1 } }), l);
  assert.equal(applyAvailabilityUpdate(l, { hospital_id: 'HSP-AMD-002', availability: {} }), l);
  assert.equal(applyAvailabilityUpdate(l, null), l);
});

test('numeric id from the backend still matches', () => {
  const l = [{ id: '7', availability: { beds_free: 1 } }];
  assert.equal(applyAvailabilityUpdate(l, { hospital_id: 7, availability: { beds_free: 2 } })[0].availability.beds_free, 2);
});

test('pickAvailability ignores unknown keys', () => {
  assert.deepEqual(pickAvailability({ beds_free: 1, token: 'x', extra: 2 }), { beds_free: 1 });
});
