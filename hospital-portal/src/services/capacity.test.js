import test from 'node:test';
import assert from 'node:assert/strict';
import { capacityView, readinessWarnings, cardWarning } from './capacity.js';
import { normaliseHospital } from './adapters.js';

const full = (over = {}, caps = {}) => ({
  id: 'H2', name: 'Heart Centre (Sample)',
  capabilities: { cath_lab: true, stroke_unit: true, icu: true, emergency: true, ...caps },
  availability: { beds_free: 6, icu_free: 1, cath_lab_ready: true, stroke_unit_ready: true, ...over },
});
const alert = (type) => ({ emergency_id: 'E1', type });
const codes = (a, h) => readinessWarnings(alert(a), h).map((w) => w.code);

test('capacity strip: counts and unit readiness', () => {
  const v = capacityView(full());
  assert.deepEqual([v.beds.text, v.icu.text, v.cath.text, v.stroke.text], ['6', '1', 'Ready', 'Ready']);
  assert.equal(v.accepting, true);
});

test('capacity strip: null counts read "Not shared" (never invented), zero is a real zero', () => {
  const v = capacityView(full({ beds_free: null, icu_free: 0 }));
  assert.equal(v.beds.text, 'Not shared');
  assert.equal(v.icu.text, '0');
  assert.equal(v.icu.value, 0);
});

test('capacity strip: no availability object at all reads Not shared everywhere', () => {
  const v = capacityView({ id: 'H9', name: 'No data', capabilities: { cath_lab: true, stroke_unit: true, icu: true, emergency: true }, availability: null });
  assert.deepEqual([v.beds.text, v.icu.text, v.cath.text, v.stroke.text], ['Not shared', 'Not shared', 'Not shared', 'Not shared']);
  assert.equal(capacityView(null), null);
});

test('capacity strip: a unit the hospital does not have says so', () => {
  const v = capacityView(full({}, { cath_lab: false, icu: false }));
  assert.equal(v.cath.text, 'No cath lab');
  assert.equal(v.icu.text, 'No ICU');
});

test('Jehal-style hospital (only an available flag) shows Not shared beds, units follow the flag', () => {
  const h = normaliseHospital({ id: 'hosp_1', name: 'Mock', lat: 1, lng: 1, available: true, capabilities: ['CATH_LAB', 'EMERGENCY'] });
  const v = capacityView(h);
  assert.equal(v.beds.text, 'Not shared');
  assert.equal(v.cath.text, 'Ready');
});

test('HEART: cath lab not ready is a warning with the exact words', () => {
  const w = readinessWarnings(alert('HEART'), full({ cath_lab_ready: false }));
  assert.equal(w[0].text, 'Your cath lab is not ready for this alert.');
  assert.equal(w[0].level, 'warning');
  assert.equal(cardWarning(alert('HEART'), full({ cath_lab_ready: false })), 'cath lab is not ready.');
});

test('HEART: ready cath lab gives no warning; a hospital with no cath lab warns; unknown readiness is only a note', () => {
  assert.deepEqual(codes('HEART', full()), []);
  assert.deepEqual(codes('HEART', full({}, { cath_lab: false })), ['no_cath']);
  const unknown = readinessWarnings(alert('HEART'), full({ cath_lab_ready: null }));
  assert.deepEqual(unknown.map((w) => [w.code, w.level]), [['cath_unknown', 'info']]);
  assert.equal(cardWarning(alert('HEART'), full({ cath_lab_ready: null })), null);
});

test('STROKE and ASTHMA check their own unit only', () => {
  assert.deepEqual(codes('STROKE', full({ stroke_unit_ready: false })), ['stroke_not_ready']);
  assert.deepEqual(codes('STROKE', full({ cath_lab_ready: false })), []); // cath lab is irrelevant for a stroke
  assert.deepEqual(codes('ASTHMA', full({ icu_free: 0 })), ['icu_full']);
  assert.deepEqual(codes('ASTHMA', full({ icu_free: null })), ['icu_unknown']);
  assert.deepEqual(codes('ASTHMA', full({ icu_free: 2 })), []);
});

test('DIABETIC needs only an emergency department', () => {
  assert.deepEqual(codes('DIABETIC', full({ cath_lab_ready: false, icu_free: 0 })), []);
  assert.deepEqual(codes('DIABETIC', full({}, { emergency: false })), ['no_emergency']);
});

test('UNKNOWN (safety check-in) needs only an emergency department, even with null availability', () => {
  assert.deepEqual(codes('UNKNOWN', full()), []);
  assert.deepEqual(codes('UNKNOWN', full({ cath_lab_ready: false, stroke_unit_ready: false, icu_free: 0 })), []);
  assert.deepEqual(codes('UNKNOWN', { id: 'H9', name: 'x', capabilities: { emergency: true }, availability: null }), []);
  assert.deepEqual(codes('UNKNOWN', full({}, { emergency: false })), ['no_emergency']);
});

test('an unrecognised type is treated like UNKNOWN', () => {
  assert.deepEqual(codes('SOMETHING_NEW', full({ cath_lab_ready: false })), []);
});

test('a hospital marked not ready warns for every type, including UNKNOWN', () => {
  for (const type of ['HEART', 'STROKE', 'DIABETIC', 'ASTHMA', 'UNKNOWN']) {
    assert.ok(codes(type, full({ ready: false })).includes('not_accepting'), type);
  }
});

test('null availability for a HEART alert is a note, not a false alarm', () => {
  const h = { id: 'H9', name: 'x', capabilities: { cath_lab: true, emergency: true }, availability: null };
  assert.deepEqual(readinessWarnings(alert('HEART'), h).map((w) => w.level), ['info']);
});

test('no alert or no hospital means no warnings', () => {
  assert.deepEqual(readinessWarnings(null, full()), []);
  assert.deepEqual(readinessWarnings(alert('HEART'), null), []);
});
