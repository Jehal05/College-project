// The Health Simulator is a "what if" range explorer, NOT a predictor. It takes the person's latest reading as the baseline,
// lets them type or slide a hypothetical value, and shows whether that value would sit inside or outside THEIR OWN usual range.
// It never estimates a risk, an outcome or a diagnosis.
export const SIM_METRICS = [
  { key: 'heart_rate', series: 'heart_rate', range: 'heart_rate', unit: 'overview.unit.bpm', min: 30, max: 200, step: 1, fallback: 72 },
  { key: 'spo2', series: 'spo2', range: 'spo2', unit: 'overview.unit.percent', min: 70, max: 100, step: 1, fallback: 97 },
  { key: 'bp', series: 'bp_sys', range: 'bp_systolic', unit: 'overview.unit.mmhg', min: 70, max: 220, step: 1, fallback: 120 },
  { key: 'glucose', series: 'glucose', range: 'glucose', unit: 'overview.unit.glucose', min: 40, max: 400, step: 1, fallback: 100 },
];

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Latest real reading for a metric, or null if none arrived yet.
export function baselineValue(m, history) {
  const s = (history && history[m.series]) || [];
  return s.length ? s[s.length - 1] : null;
}

// Where a hypothetical slider starts: the latest reading, else the middle of the person's usual range, else a neutral default.
export function startValue(m, history, baseline) {
  const b = baselineValue(m, history);
  const r = baseline && baseline[m.range];
  const v = b !== null ? b : r ? (r.min + r.max) / 2 : m.fallback;
  return clamp(Math.round(v), m.min, m.max);
}

export function placement(value, range) {
  if (!range || value === null || value === undefined) return null;
  return value >= range.min && value <= range.max ? 'within' : 'outside';
}

// One comparison row: baseline vs hypothetical, with the change and where each sits against the usual range.
export function compare(m, { history, baseline }, hypo) {
  const base = baselineValue(m, history);
  const range = (baseline && baseline[m.range]) || null;
  return { key: m.key, unit: m.unit, base, hypo, change: base === null ? null : Math.round((hypo - base) * 10) / 10, range, baseStatus: placement(base, range), hypoStatus: placement(hypo, range) };
}

// How much the real readings have wobbled recently: this is the honest "uncertainty" the screen can show.
export function spread(series) {
  const s = (series || []).filter((x) => typeof x === 'number');
  return s.length ? { min: Math.min(...s), max: Math.max(...s), count: s.length } : null;
}

// Metrics whose hypothetical value would sit outside the usual range while the baseline does not (or there is no baseline).
export const wouldLeave = (rows) => rows.filter((r) => r.hypoStatus === 'outside' && r.baseStatus !== 'outside').map((r) => r.key);
