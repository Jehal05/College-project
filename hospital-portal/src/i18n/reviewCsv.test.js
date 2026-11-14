import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from './en.js';
import hi from './hi.js';
import gu from './gu.js';
import { parseCsv, toCsv, placeholders, isMedical, parseDict, escapeJs, applyToSource, readCorrections, buildReviewCsv, pagesByKey, REVIEW_COLUMNS } from './reviewCsv.js';

// Small fixture dictionaries, so these tests never depend on the real Hindi or Gujarati wording (which reviewers will change).
const q = (o) => `export default {\n${Object.entries(o).map(([k, v]) => `  '${escapeJs(k)}': '${escapeJs(v)}',`).join('\n')}\n};\n`;
const FX_EN = { 'nav.map': 'Map', 'u.km': '{n} km', 'app.simulated': 'Simulated prototype', 'warn.warning': 'Warning: ', 'pair.two': '{a} of {b}', 'type.STROKE': 'Stroke' };
const FX_HI = { 'nav.map': 'नक्शा', 'u.km': '{n} किमी', 'app.simulated': 'Simulated प्रोटोटाइप', 'warn.warning': 'चेतावनी: ', 'pair.two': '{b} में से {a}', 'type.STROKE': 'स्ट्रोक' };
const FX_GU = { 'nav.map': 'નકશો', 'u.km': '{n} કિમી', 'app.simulated': 'Simulated પ્રોટોટાઇપ', 'warn.warning': 'ચેતવણી: ', 'pair.two': '{b} માંથી {a}', 'type.STROKE': 'સ્ટ્રોક' };
const FX_HI_SRC = q(FX_HI);
const dicts = { en: FX_EN, hi: FX_HI, gu: FX_GU };
const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');

// A filled sheet: the exported CSV with some *_fixed cells typed in.
function filled(fixes) {
  const rows = parseCsv(buildReviewCsv(dicts));
  const col = Object.fromEntries(rows[0].map((h, i) => [h, i]));
  for (const row of rows.slice(1)) {
    const f = fixes[row[col.key]];
    if (f) { if (f.hi !== undefined) row[col.hindi_fixed] = f.hi; if (f.gu !== undefined) row[col.gujarati_fixed] = f.gu; if (f.note) row[col.note] = f.note; }
  }
  return toCsv(rows);
}

test('CSV: quotes, commas, line breaks, BOM and Windows line ends round-trip', () => {
  const rows = [['a', 'b,c', 'say "hi"'], ['line\nbreak', ' spaced ', '']];
  assert.deepEqual(parseCsv(`﻿${toCsv(rows)}`), rows);
  assert.deepEqual(parseCsv('a,b\r\nc,d\r\n\r\n'), [['a', 'b'], ['c', 'd']]);
  assert.throws(() => parseCsv('a,"open'), /never closed/);
});
test('placeholders are compared as sets of names', () => {
  assert.deepEqual(placeholders('{n} km and {km}'), ['{km}', '{n}']);
  assert.deepEqual(placeholders('no placeholders'), []);
});
test('the export has every key once, in the agreed columns, with the current text', () => {
  const rows = parseCsv(buildReviewCsv({ en, hi, gu }));
  assert.deepEqual(rows[0], REVIEW_COLUMNS);
  assert.equal(rows.length - 1, Object.keys(en).length);
  const col = Object.fromEntries(rows[0].map((h, i) => [h, i]));
  const byKey = Object.fromEntries(rows.slice(1).map((r) => [r[col.key], r]));
  assert.equal(Object.keys(byKey).length, Object.keys(en).length);
  for (const k of Object.keys(en).slice(0, 40)) {
    assert.equal(byKey[k][col.english], en[k]);
    assert.equal(byKey[k][col.hindi], hi[k]);
    assert.equal(byKey[k][col.gujarati], gu[k]);
    assert.equal(byKey[k][col.hindi_fixed], '');
  }
  for (const k of Object.keys(en)) assert.equal(byKey[k][col.keep_exactly], placeholders(en[k]).join(' '), k);
});
test('medical terms are marked: emergency types, capabilities, severities, warnings and clinical words', () => {
  assert.equal(isMedical('type.STROKE', 'Stroke'), true);
  assert.equal(isMedical('capl.cath_lab', 'Cath Lab'), true);
  assert.equal(isMedical('sev.URGENT', 'URGENT'), true);
  assert.equal(isMedical('warn.c.no_icu', 'x'), true);
  assert.equal(isMedical('x.y', 'ECG machine'), true);
  assert.equal(isMedical('nav.map', 'Map'), false);
  const rows = parseCsv(buildReviewCsv({ en, hi, gu }));
  const col = Object.fromEntries(rows[0].map((h, i) => [h, i]));
  const medical = rows.slice(1).filter((r) => r[col.medical] === 'MEDICAL').map((r) => r[col.key]);
  for (const k of Object.keys(en).filter((k) => /^(type|cap|capl|sev|warn)\./.test(k))) assert.ok(medical.includes(k), k);
  assert.ok(!medical.includes('nav.map'));
});
test('pages: a key is traced to the pages and parts that use it, including keys built in code', () => {
  const files = [
    { rel: 'pages/Report.jsx', text: "t('rp.title') t(`rp.o.${k}`)" },
    { rel: 'components/NavBar.jsx', text: "t('nav.map')" },
    { rel: 'components/Timeline.jsx', text: "L('rp.title')" },
  ];
  const p = pagesByKey(['rp.title', 'rp.o.open', 'nav.map', 'zzz.none'], files);
  assert.equal(p['rp.title'], 'Report, Timeline');
  assert.equal(p['rp.o.open'], 'Report');
  assert.equal(p['nav.map'], 'NavBar');
  assert.equal(p['zzz.none'], '(not found in code)');
});

test('import: empty cells change nothing', () => {
  const r = readCorrections(filled({}), dicts);
  assert.deepEqual([r.changes.length, r.problems.length], [0, 0]);
  assert.ok(r.emptyCells > 0);
});
test('import: a good correction is accepted for one language only', () => {
  const r = readCorrections(filled({ 'nav.map': { hi: 'मानचित्र' } }), dicts);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.changes.map((c) => [c.lang, c.key, c.value]), [['hi', 'nav.map', 'मानचित्र']]);
});
test('import: a correction equal to the current text counts as unchanged', () => {
  const r = readCorrections(filled({ 'nav.map': { hi: hi['nav.map'] } }), dicts);
  assert.equal(r.changes.length, 0);
  assert.equal(r.unchanged, 1);
});
test('import: a changed placeholder is rejected (missing, renamed, or added)', () => {
  for (const bad of ['{N} किमी', '{x} किमी', '{n} {m} किमी', 'किमी']) {
    const r = readCorrections(filled({ 'u.km': { hi: bad } }), dicts);
    assert.equal(r.changes.length, 0, bad);
    assert.match(r.problems.join(), /placeholders changed/, bad);
  }
  const ok = readCorrections(filled({ 'u.km': { gu: '{n} કિલોમીટર' } }), dicts);
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.changes[0].value, '{n} કિલોમીટર');
});
test('import: the same placeholders in another order are fine', () => {
  const r = readCorrections(filled({ 'pair.two': { hi: '{a} में से {b}' } }), dicts);
  assert.deepEqual(r.problems, []);
});
test('import: the word "Simulated" must stay in English', () => {
  const r = readCorrections(filled({ 'app.simulated': { hi: 'सिम्युलेटेड प्रोटोटाइप' } }), dicts);
  assert.match(r.problems.join(), /must stay in English/);
  assert.equal(readCorrections(filled({ 'app.simulated': { hi: 'Simulated नमूना' } }), dicts).problems.length, 0);
});
test('import: spaces at the ends of the English are kept even if the spreadsheet dropped them', () => {
  const r = readCorrections(filled({ 'warn.warning': { hi: 'सावधान:' } }), dicts);
  assert.deepEqual(r.problems, []);
  assert.equal(r.changes[0].value, 'सावधान: ');
});
test('import: unknown keys, duplicate rows, line breaks and an out-of-date sheet are rejected', () => {
  let csv = filled({ 'nav.map': { hi: 'नक्शा 2' } });
  assert.match(readCorrections(`${csv}nope.key,,,,Nope,,,x,,\r\n`, dicts).problems.join(), /not a key/);
  assert.match(readCorrections(`${csv}nav.map,,,,Map,,,again,,\r\n`, dicts).problems.join(), /appears twice/);
  assert.match(readCorrections(filled({ 'nav.map': { hi: 'a\nb' } }), dicts).problems.join(), /line break/);
  const stale = parseCsv(csv); const col = Object.fromEntries(stale[0].map((h, i) => [h, i]));
  stale.find((r) => r[col.key] === 'nav.map')[col.english] = 'Old English';
  assert.match(readCorrections(toCsv(stale), dicts).problems.join(), /out of date/);
  assert.match(readCorrections('a,b\r\n1,2\r\n', dicts).problems.join(), /no "key" column/);
});
test('import: a hindi cell with no Hindi letters is accepted with a warning', () => {
  const r = readCorrections(filled({ 'nav.map': { hi: 'Map' } }), dicts);
  assert.equal(r.problems.length, 0);
  assert.equal(r.warnings.length, 1);
});
test('import: notes are carried to the report', () => {
  const r = readCorrections(filled({ 'nav.map': { hi: 'मानचित्र', note: 'more common word' } }), dicts);
  assert.equal(r.changes[0].note, 'more common word');
});

test('apply: only the changed value moves; every key stays; quotes and backslashes are escaped', () => {
  const src = FX_HI_SRC;
  const next = applyToSource(src, [{ lang: 'hi', key: 'nav.map', value: "मानचित्र 'x' \\ y" }]);
  const a = parseDict(src); const b = parseDict(next);
  assert.deepEqual([...b.keys()], [...a.keys()]);
  assert.equal(b.get('nav.map'), "मानचित्र 'x' \\ y");
  for (const [k, v] of a) if (k !== 'nav.map') assert.equal(b.get(k), v, k);
  assert.equal(next.split('\n').length, src.split('\n').length);
  assert.equal(escapeJs("a'b\\c"), "a\\'b\\\\c");
});
test('apply: an unknown key or a duplicate line is refused and nothing is returned', () => {
  assert.throws(() => applyToSource(FX_HI_SRC, [{ key: 'no.such.key', value: 'x' }]), /found 0 times/);
  const doubled = "  'a.b': 'one',\n  'a.b': 'two',\n";
  assert.throws(() => applyToSource(doubled, [{ key: 'a.b', value: 'x' }]), /found 2 times/);
  assert.throws(() => applyToSource(FX_HI_SRC, [{ key: 'nav.map', value: 'a\nb' }]), /line break/);
});
test('apply: the whole flow keeps hi, gu and en with identical key sets and placeholders', () => {
  const csv = filled({ 'nav.map': { hi: 'मानचित्र', gu: 'નકશો 2' }, 'u.km': { gu: '{n} કિલોમીટર' }, 'pair.two': { hi: '{a} / {b}' } });
  const r = readCorrections(csv, dicts);
  assert.deepEqual(r.problems, []);
  const hiNew = parseDict(applyToSource(q(FX_HI), r.changes.filter((c) => c.lang === 'hi')));
  const guNew = parseDict(applyToSource(q(FX_GU), r.changes.filter((c) => c.lang === 'gu')));
  assert.deepEqual([...hiNew.keys()], Object.keys(FX_EN));
  assert.deepEqual([...guNew.keys()], Object.keys(FX_EN));
  for (const k of Object.keys(FX_EN)) { assert.equal(placeholders(hiNew.get(k)).join(), placeholders(FX_EN[k]).join(), k); assert.equal(placeholders(guNew.get(k)).join(), placeholders(FX_EN[k]).join(), k); }
  assert.equal(guNew.get('u.km'), '{n} કિલોમીટર');
  assert.equal(hiNew.get('nav.map'), 'मानचित्र');
  assert.equal(hiNew.get('u.km'), FX_HI['u.km']); // untouched
});
test('the dictionary files can be read line by line (the import depends on it)', () => {
  for (const f of ['en.js', 'hi.js', 'gu.js']) assert.equal(parseDict(read(f)).size, Object.keys(en).length, f);
});
