// The ten emergency types: every type has symptoms, labels in three languages, a vitals profile, a draft rule, draft tips and a staff checklist.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Module = require('node:module');
const fake = { Router: () => { const r = {}; for (const m of ['get', 'post', 'delete', 'patch', 'put', 'use']) r[m] = () => {}; return r; } };
const orig = Module._load;
Module._load = function (req, ...a) { return req === 'express' ? fake : orig.call(this, req, ...a); };
const types = require('../data/emergencyTypes.json');
const rules = require('../rules');
const table = require('../data/rules.json');
const vitals = require('../vitals');
const { symptomLabels, SYMPTOM_TO_ENGINE } = require('../adapters');
const helpers = require('../helpers');
Module._load = orig;

const root = path.join(__dirname, '../..');
const json = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const TYPES = Object.keys(types);
const NEW = ['ACCIDENT', 'SEIZURE', 'ALLERGIC', 'POISONING', 'BURN', 'PREGNANCY'];

test('ten types, the six new ones have five symptoms each', () => {
  assert.strictEqual(TYPES.length, 10);
  for (const t of NEW) assert.strictEqual(types[t].length, 5, t);
});

test('every symptom has an English label for the hospital desk and an engine name', () => {
  for (const t of TYPES) for (const id of types[t]) {
    assert.notStrictEqual(symptomLabels([id])[0], id, id + ' has no label');
    assert.ok(id in SYMPTOM_TO_ENGINE, id + ' not in the adapter');
  }
});

test('every new type has at least one rule, all pending doctor review, and an emergency-level rule', () => {
  for (const t of NEW) {
    const mine = table.rules.filter((r) => r.type === t);
    assert.ok(mine.length >= 3, t);
    assert.ok(mine.every((r) => r.review_status === 'pending doctor review'), t);
    assert.ok(mine.some((r) => r.severity === 'EMERGENCY'), t);
  }
});

test('rules fire for typical symptoms and never claim to be reviewed', () => {
  const cases = { ACCIDENT: ['SEVERE_BLEEDING'], SEIZURE: ['SEIZURE_LONG'], ALLERGIC: ['ALLERGY_BREATH'], POISONING: ['POISON_SWALLOWED', 'POISON_DROWSY'], BURN: ['BURN_BREATH'], PREGNANCY: ['PREG_BLEEDING'] };
  for (const [t, ids] of Object.entries(cases)) {
    const r = rules.evaluate(ids, {});
    assert.strictEqual(r.type, t);
    assert.strictEqual(r.severity, 'EMERGENCY');
    assert.strictEqual(r.reviewed, false);
  }
  assert.strictEqual(rules.evaluate(['PREG_LABOUR'], {}).severity, 'URGENT');
  assert.strictEqual(rules.evaluate(['ALLERGY_TRIGGER'], { bp_sys: 82 }).severity, 'EMERGENCY', 'a vitals rule works');
  assert.strictEqual(rules.evaluate(['ALLERGY_TRIGGER'], { bp_sys: 120 }).severity, 'NONE');
});

test('every type has a simulated vitals profile and a hospital capability entry', () => {
  for (const t of TYPES) {
    assert.ok(vitals.applyChange({ profile: t }, () => true).status === 200, t + ' profile');
    assert.ok(helpers.rankHospitals(t, helpers.DEMO_LOCATION).length > 0, t + ' has no hospital');
  }
  vitals.reset();
});

test('each new profile looks like its situation (simulated)', () => {
  const r = (name) => vitals.PROFILES[name];
  assert.ok(r('allergic').bp_sys[1] < 100 && r('allergic').spo2[1] < 95);
  assert.ok(r('pregnancy').bp_sys[0] >= 140);
  assert.ok(r('accident').heart_rate[0] > 100);
});

const langs = ['en', 'hi', 'gu'];
test('labels, symptoms and draft tips exist in English, Hindi and Gujarati for all ten types', () => {
  const instr = json('patient-app/src/config/instructions.json');
  for (const l of langs) {
    const d = json('patient-app/src/i18n/' + l + '.json');
    for (const t of TYPES) {
      assert.ok(d['emergencyType.' + t], l + ' emergencyType.' + t);
      for (const id of types[t]) assert.ok(d['symptom.' + id], l + ' symptom.' + id);
      assert.ok(instr[t] && instr[t].lines.length >= 3, t + ' tips');
      for (const key of instr[t].lines) assert.ok(d[key], l + ' ' + key);
    }
    for (const t of TYPES) assert.ok(d['category.' + t], l + ' category.' + t);
    assert.ok(d['emergency.draftTips']);
  }
});

test('the first lines are always Call 112 / 108; tips are drafts until a doctor reviews them; no medicine doses', () => {
  const instr = json('patient-app/src/config/instructions.json');
  const en = json('patient-app/src/i18n/en.json');
  assert.strictEqual(en['instructions.general1'], 'Call 112 / 108 now.');
  for (const t of TYPES) {
    assert.strictEqual(instr[t].reviewed, false, t);
    for (const key of instr[t].lines) assert.ok(!/\b\d+\s*(mg|ml|mcg|tablet|tablets)\b/i.test(en[key]), 'dose in ' + key);
  }
  assert.match(en['emergency.draftTips'], /Not reviewed by a doctor/);
  assert.match(en['emergency.draftTips'], /112 \/ 108/);
});

test('the symptom screen lists every type with an icon', () => {
  const cfg = fs.readFileSync(path.join(root, 'patient-app/src/config/symptoms.js'), 'utf8');
  const screen = fs.readFileSync(path.join(root, 'patient-app/src/screens/Symptoms.jsx'), 'utf8');
  for (const t of TYPES) { assert.ok(cfg.includes("type: '" + t + "'"), t); assert.ok(screen.includes(t + ": '"), t + ' icon'); }
});

test('the portal knows all ten types: label, capability, specialty, staff checklist, translations', () => {
  const contract = fs.readFileSync(path.join(root, 'hospital-portal/src/services/contract.js'), 'utf8');
  const checklists = json('hospital-portal/src/data/checklists.json');
  const ranking = json('hospital-portal/src/data/ranking-config.json');
  for (const t of TYPES) {
    assert.ok(new RegExp("\\b" + t + ": '").test(contract), t + ' label');
    assert.ok(Array.isArray(ranking.required_capabilities[t]), t + ' ranking');
    assert.ok(checklists[t] && checklists[t].length >= 3, t + ' checklist');
    assert.ok(checklists[t].every((c) => c.status === 'draft' && c.reviewed_by === null), t + ' checklist must stay draft');
    for (const l of langs) assert.ok(fs.readFileSync(path.join(root, 'hospital-portal/src/i18n/' + l + '.js'), 'utf8').includes("'type." + t + "'"), l + ' ' + t);
  }
});
