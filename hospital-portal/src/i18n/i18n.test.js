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

// Every literal key passed to t('...') in the app must exist, so a screen can never show a raw key.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(jsx?|mjs)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

test('every literal t("key") used in the source exists in en, hi and gu', () => {
  const missing = [];
  for (const file of sourceFiles(new URL('..', import.meta.url).pathname)) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) {
      if (!(m[1] in en && m[1] in hi && m[1] in gu)) missing.push(`${file.split('/src/')[1]}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('keys built from a template (an.step.*, act.k.*, act.w.*, admin.cap.*, fleet.s.*) exist for every value', () => {
  const need = [];
  for (const k of ['alert_to_ack', 'ack_to_dispatch', 'dispatch_to_arrival', 'arrival_to_handover']) need.push(`an.step.${k}`);
  for (const k of ['all', 'state', 'note', 'checklist']) need.push(`act.k.${k}`);
  for (const k of ['all', 'staff', 'patient', 'ambulance', 'system']) need.push(`act.w.${k}`);
  for (const k of ['cath_lab', 'stroke_unit', 'icu', 'emergency']) need.push(`admin.cap.${k}`);
  for (const k of need) assert.ok(k in en && k in hi && k in gu, k);
});
