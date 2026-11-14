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
