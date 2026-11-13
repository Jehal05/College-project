import test from 'node:test';
import assert from 'node:assert/strict';
import { accuracyText } from './locationText.js';

test('a real accuracy is shown, rounded', () => {
  assert.equal(accuracyText({ accuracy: 50 }), ' (±50 m)');
  assert.equal(accuracyText({ accuracy_m: 14.6 }), ' (±15 m)');
});
test('0, missing, negative or bad accuracy shows nothing', () => {
  for (const loc of [{ accuracy: 0 }, { accuracy_m: 0 }, {}, { accuracy: -3 }, { accuracy: 'abc' }, { accuracy: null }, null, undefined]) assert.equal(accuracyText(loc), '');
});
