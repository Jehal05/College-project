import test from 'node:test';
import assert from 'node:assert/strict';
import en from './en.js';
import hi from './hi.js';
import gu from './gu.js';
import { translate, DICTS, LANGS } from './translate.js';

const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

for (const [name, dict] of [['hi', hi], ['gu', gu]]) {
  test(`${name} has exactly the same keys as English`, () => {
    assert.deepEqual(Object.keys(dict).sort(), Object.keys(en).sort());
  });
  test(`${name}: every string is filled and keeps the same {placeholders}`, () => {
    for (const k of Object.keys(en)) {
      assert.ok(typeof dict[k] === 'string' && dict[k].trim().length > 0, `${name}.${k} is empty`);
      assert.equal(vars(dict[k]), vars(en[k]), `${name}.${k} placeholders differ`);
    }
  });
  test(`${name}: "Simulated" stays in English wherever English has it`, () => {
    for (const k of Object.keys(en)) if (/Simulated/.test(en[k])) assert.match(dict[k], /Simulated/, `${name}.${k}`);
  });
  test(`${name} really is that script (not English copied)`, () => {
    const re = name === 'hi' ? /[ऀ-ॿ]/ : /[઀-૿]/;
    assert.ok(Object.keys(en).filter((k) => re.test(dict[k])).length > Object.keys(en).length * 0.9);
  });
}
test('translate fills placeholders', () => assert.equal(translate('en', 'offline.back', { n: 3 }), 'Reconnected. Reloaded 3 alerts.'));
test('unknown language falls back to English', () => assert.equal(translate('fr', 'nav.map'), 'Map'));
test('missing key falls back to the key itself', () => assert.equal(translate('hi', 'no.such.key'), 'no.such.key'));
test('missing key in a language falls back to English', () => {
  const saved = DICTS.hi['nav.map'];
  delete DICTS.hi['nav.map'];
  assert.equal(translate('hi', 'nav.map'), 'Map');
  DICTS.hi['nav.map'] = saved;
});
test('unfilled placeholder is left visible rather than hidden', () => assert.equal(translate('en', 'dash.unread'), '{n} unread'));
test('languages list matches dictionaries', () => assert.deepEqual(LANGS.map((l) => l.code).sort(), Object.keys(DICTS).sort()));
test('no dictionary translates symptom words (no symptom keys exist)', () => {
  assert.ok(!Object.keys(en).some((k) => /symptom/i.test(k)));
});
