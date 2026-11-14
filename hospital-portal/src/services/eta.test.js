import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEta } from './eta.js';
import { translate } from '../i18n/translate.js';

const tr = (lang) => (key, vars) => translate(lang, key, vars);

test('English text is the same with and without t', () => {
  for (const [sec, text] of [[0, '0 s'], [42, '42 s'], [59.6, '1 min 00 s'], [60, '1 min 00 s'], [125, '2 min 05 s'], [-5, '0 s']]) {
    assert.equal(formatEta(sec), text);
    assert.equal(formatEta(sec, tr('en')), text);
  }
});

test('Hindi and Gujarati use their own unit words and keep the numbers', () => {
  assert.equal(formatEta(42, tr('hi')), '42 सेकंड');
  assert.equal(formatEta(125, tr('hi')), '2 मिनट 05 सेकंड');
  assert.equal(formatEta(125, tr('gu')), '2 મિનિટ 05 સેકન્ડ');
});

import { legText } from './eta.js';

test('legText: English with a distance is exactly the old text', () => {
  assert.equal(legText({ arrived: false, live: true, ambulance: { leg: 'to_patient', remaining_km: 5.62 } }), 'Heading to the patient · 5.62 km left in total');
  assert.equal(legText({ arrived: false, live: true, ambulance: { leg: 'to_hospital', remaining_km: 2.1 } }), 'Patient on board · heading to the hospital · 2.1 km left');
  assert.equal(legText({ arrived: true, live: true, ambulance: {} }), 'Ambulance is at the hospital');
  assert.equal(legText({ arrived: false, live: false, ambulance: undefined }), 'Ambulance assigned, about to leave');
});

test('legText: a backend that sends no remaining_km never shows "undefined"', () => {
  for (const ambulance of [{ leg: 'to_patient' }, { leg: 'to_hospital' }, { leg: 'to_hospital', remaining_km: null }, { leg: 'to_patient', remaining_km: 'x' }]) {
    for (const lang of [undefined, 'en', 'hi', 'gu']) {
      const out = legText({ arrived: false, live: true, ambulance }, lang ? tr(lang) : undefined);
      assert.ok(!/undefined|null|NaN/.test(out), out);
    }
  }
  assert.equal(legText({ arrived: false, live: true, ambulance: { leg: 'to_patient' } }), 'Heading to the patient');
});

test('legText: remaining_km 0 is a real distance, and Hindi keeps the number', () => {
  assert.equal(legText({ arrived: false, live: true, ambulance: { leg: 'to_hospital', remaining_km: 0 } }), 'Patient on board · heading to the hospital · 0 km left');
  assert.ok(legText({ arrived: false, live: true, ambulance: { leg: 'to_hospital', remaining_km: 3.4 } }, tr('hi')).includes('3.4'));
});
