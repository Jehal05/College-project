// Digital twin rule, kept simple so it is easy to explain:
// a vital is "within your usual range" when min <= value <= max. Anything else is "different". It is NOT a diagnosis.
export const inRange = (value, range) => typeof value === 'number' && value >= range.min && value <= range.max;

// Build the four rows shown in the bar. vitals = { heart_rate, spo2, bp: "120/80", glucose }.
// within is true / false, or null when the reading is not available yet.
export function twinRows(vitals, baseline) {
  const [sys, dia] = String(vitals.bp || '').split('/').map(Number);
  const hasBp = Number.isFinite(sys) && Number.isFinite(dia);
  const row = (key, value, usual, ok) => ({ key, value: value ?? '--', usual, within: value == null ? null : ok });
  return [
    row('heart_rate', vitals.heart_rate, baseline.heart_rate.min + '-' + baseline.heart_rate.max, inRange(vitals.heart_rate, baseline.heart_rate)),
    row('spo2', vitals.spo2, baseline.spo2.min + '-' + baseline.spo2.max, inRange(vitals.spo2, baseline.spo2)),
    row('bp', hasBp ? sys + '/' + dia : null, baseline.bp_systolic.min + '-' + baseline.bp_systolic.max + ' / ' +
      baseline.bp_diastolic.min + '-' + baseline.bp_diastolic.max, hasBp && inRange(sys, baseline.bp_systolic) && inRange(dia, baseline.bp_diastolic)),
    row('glucose', vitals.glucose, baseline.glucose.min + '-' + baseline.glucose.max, inRange(vitals.glucose, baseline.glucose)),
  ];
}

// One status per organ, from the same rule as above: 'different' if any linked reading changed from the usual,
// 'within' if all linked readings are usual, 'waiting' if a reading is linked but not here yet, 'nodata' if this prototype has no reading for the organ.
// It is never a diagnosis. `organs` is the ORGANS list from config/organs.js.
export function organStatuses(organs, vitals, baseline) {
  const rows = vitals && baseline ? twinRows(vitals, baseline) : [];
  const out = {};
  for (const o of organs) {
    const linked = o.metrics.map((m) => rows.find((r) => r.key === m.key)).filter(Boolean);
    if (o.metrics.every((m) => !rows.some((r) => r.key === m.key)) && (rows.length > 0 || o.metrics.length === 0)) { out[o.key] = 'nodata'; continue; }
    if (linked.length === 0) { out[o.key] = 'waiting'; continue; }
    if (linked.some((r) => r.within === false)) out[o.key] = 'different';
    else if (linked.some((r) => r.within === null)) out[o.key] = 'waiting';
    else out[o.key] = 'within';
  }
  return out;
}
