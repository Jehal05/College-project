import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from './translate.js';
import { stateText, stepText, actionText, capText } from './phrases.js';

const tr = (lang) => (key, vars) => translate(lang, key, vars);

test('English gives exactly the old labels', () => {
  assert.equal(stateText(tr('en'), 'HOSPITAL_ACKNOWLEDGED'), 'Acknowledged · no ambulance dispatched yet');
  assert.equal(stateText(tr('en'), 'ESCALATED'), 'Escalated to the next hospital · not acknowledged yet');
  assert.equal(actionText(tr('en'), 'AMBULANCE_DISPATCHED', 'Dispatch'), 'Dispatch');
  assert.equal(capText(tr('en'), 'Ready'), 'Ready');
  assert.equal(capText(tr('en'), 'Not shared'), 'Not shared');
});

test('Hindi and Gujarati give their own words, numbers pass through', () => {
  assert.notEqual(stateText(tr('hi'), 'SOS_SENT'), stateText(tr('en'), 'SOS_SENT'));
  assert.notEqual(stateText(tr('gu'), 'ARRIVED'), stateText(tr('en'), 'ARRIVED'));
  assert.notEqual(capText(tr('hi'), 'Not ready'), 'Not ready');
  assert.equal(capText(tr('gu'), '11'), '11');
});

test('unknown states and steps fall back to English, never to a raw key', () => {
  assert.equal(stateText(tr('hi'), 'SOMETHING_NEW'), 'SOMETHING_NEW');
  assert.equal(stepText(tr('hi'), 'MONITORING', 'Monitoring'), 'Monitoring');
  assert.equal(actionText(tr('gu'), 'NOPE', 'Nope'), 'Nope');
});

test('every real state has a translation in all three languages', () => {
  for (const lang of ['en', 'hi', 'gu']) {
    for (const s of ['EMERGENCY_DETECTED', 'SOS_SENT', 'ESCALATED', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE', 'CANCELLED']) {
      assert.notEqual(tr(lang)(`state.${s}`), `state.${s}`, `${lang} ${s}`);
    }
  }
});

test('emergency type names: English is unchanged, Hindi and Gujarati differ, unknown falls back', async () => {
  const { typeText } = await import('./phrases.js');
  const { TYPE_LABELS, EMERGENCY_TYPES } = await import('../services/contract.js');
  for (const ty of EMERGENCY_TYPES) {
    assert.equal(typeText(tr('en'), ty), TYPE_LABELS[ty]);
    assert.notEqual(typeText(tr('hi'), ty), TYPE_LABELS[ty]);
    assert.notEqual(typeText(tr('gu'), ty), TYPE_LABELS[ty]);
  }
  assert.equal(typeText(tr('hi'), 'NEW_TYPE'), 'NEW_TYPE');
});

test('durations: English matches formatSeconds, Hindi and Gujarati use their own unit words', async () => {
  const { durationText } = await import('./phrases.js');
  const { formatSeconds } = await import('../services/report.js');
  for (const sec of [0, 18, 55, 59.6, 60, 125, 3599, 3600, 7260]) {
    assert.equal(durationText(tr('en'), sec), formatSeconds(sec));
  }
  assert.equal(durationText(tr('hi'), 55), '55 सेकंड');
  assert.equal(durationText(tr('gu'), 125), '2 મિનિટ 5 સેકન્ડ');
  assert.equal(durationText(tr('hi'), 3660), '1 घंटा 1 मिनट');
});

test('detail panel, ranking, nearby help and hospital panel strings are translated in Hindi and Gujarati', async () => {
  const DICTS = { en: (await import('./en.js')).default, hi: (await import('./hi.js')).default, gu: (await import('./gu.js')).default };
  const prefixes = ['rc.', 'nb.', 'ctl.', 'hd.', 'mv.', 'rk.', 'tk.', 'rd.', 'map.topRanked', 'map.erOnly'];
  const sameIsFine = new Set(['tk.unitTip', 'tk.trafficOpt', 'rd.etaSim']); // only placeholders and the word simulated
  const keys = Object.keys(DICTS.en).filter((k) => prefixes.some((p) => k.startsWith(p)));
  assert.ok(keys.length >= 90, `expected many keys, got ${keys.length}`);
  for (const k of keys) {
    for (const lang of ['hi', 'gu']) {
      assert.ok(DICTS[lang][k], `${lang} is missing ${k}`);
      if (!sameIsFine.has(k)) assert.notEqual(DICTS[lang][k], DICTS.en[k], `${lang} ${k} is still English`);
      // placeholders must survive translation
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
      assert.equal(ph(DICTS[lang][k]), ph(DICTS.en[k]), `${lang} ${k} changed its placeholders`);
    }
  }
});

test('formatWhen: English keeps the browser default, Hindi and Gujarati use their own locale', async () => {
  const { formatWhen } = await import('./phrases.js');
  const iso = '2026-11-14T06:44:40.000Z';
  const old = new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  assert.equal(formatWhen(iso, 'en'), old);
  assert.equal(formatWhen(iso, undefined), old);
  assert.equal(formatWhen(iso, 'hi'), new Date(iso).toLocaleString('hi-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  assert.equal(formatWhen(iso, 'gu'), new Date(iso).toLocaleString('gu-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
});
