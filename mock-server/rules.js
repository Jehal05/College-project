// Port of Daksh's rules engine (backend/app/rules/engine.py, rules v0.1) so the mock server can say WHY an alert fired.
// Positive-only conditions, highest severity wins, chest pain is always an emergency (safety floor).
// It is escalation support, never a diagnosis. Every rule is still "pending doctor review".
const table = require('./data/rules.json');
const { toEngineSymptoms } = require('./adapters');

const RANK = { NONE: 0, WATCH: 1, URGENT: 2, EMERGENCY: 3 };
const TYPE_PRIORITY = ['HEART', 'STROKE', 'DIABETIC', 'ASTHMA'];
const OPS = {
  lt: (v, n) => v < n, lte: (v, n) => v <= n, gt: (v, n) => v > n, gte: (v, n) => v >= n,
};

const norm = (s) => String(s).trim().toLowerCase().replace(/[\s-]+/g, '_');

// Keep only numeric vitals; anything else is ignored, never an error.
function cleanVitals(vitals) {
  const out = {};
  if (!vitals || typeof vitals !== 'object') return out;
  for (const [name, value] of Object.entries(vitals)) {
    if (typeof value === 'boolean' || value === null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) out[norm(name)] = n;
  }
  return out;
}

function matches(rule, symptoms, vitals) {
  const when = rule.when || {};
  if (!(when.all_symptoms || []).every((s) => symptoms.has(s))) return false;
  if (when.any_symptoms && !when.any_symptoms.some((s) => symptoms.has(s))) return false;
  return Object.entries(when.vitals || {}).every(([name, tests]) =>
    name in vitals && Object.entries(tests).every(([op, limit]) => OPS[op](vitals[name], limit)));
}

const reviewed = (rule) => rule.review_status === 'reviewed';

// appSymptoms: the app's IDs (CHEST_PAIN ...). vitals: { heart_rate, spo2, bp_sys, bp_dia, glucose, resp_rate }.
function evaluate(appSymptoms, vitals) {
  const symptoms = new Set(toEngineSymptoms(appSymptoms));
  const clean = cleanVitals(vitals);
  const hits = table.rules.filter((r) => matches(r, symptoms, clean));
  if (symptoms.has('chest_pain') && !hits.some((r) => r.severity === 'EMERGENCY' && r.type === 'HEART')) {
    hits.push({ id: 'SAFETY_FLOOR_CHEST_PAIN', type: 'HEART', severity: 'EMERGENCY',
      reason: 'Chest pain is always treated as an emergency (safety floor)', review_status: 'pending doctor review' });
  }
  hits.sort((a, b) => RANK[b.severity] - RANK[a.severity] || TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type) || a.id.localeCompare(b.id));
  const matched_rules = hits.map((r) => ({ id: r.id, type: r.type, severity: r.severity, reason: r.reason, reviewed: reviewed(r) }));
  return {
    severity: hits.length ? hits[0].severity : 'NONE',
    type: hits.length ? hits[0].type : null,
    matched_rules,
    reviewed: matched_rules.length > 0 && matched_rules.every((r) => r.reviewed),
  };
}

module.exports = { evaluate, cleanVitals, rulesVersion: table.version };
