// Turns the server's "reasons" answer into what the "Why this alert" card shows. It never diagnoses and never shows a score.
// A rule's own sentence is medical wording, so it is shown ONLY when that rule is marked reviewed. Until then: one neutral line.
const READINGS = [
  ['heart_rate', 'unit.bpm'], ['spo2', 'unit.percent'], ['glucose', 'unit.mgdl'], ['resp_rate', 'unit.perMinute'],
];

export function reasonsView(data) {
  const inputs = data.inputs || {};
  const v = inputs.vitals || {};
  const readings = READINGS.filter(([k]) => typeof v[k] === 'number').map(([key, unit]) => ({ key, value: v[key], unit }));
  if (typeof v.bp_sys === 'number' && typeof v.bp_dia === 'number') readings.splice(2, 0, { key: 'bp', value: v.bp_sys + '/' + v.bp_dia, unit: 'unit.mmhg' });
  const rules = data.matched_rules || [];
  return {
    symptoms: inputs.symptoms || [],
    readings,
    readingsAt: inputs.vitals_at || null,
    matched: rules.length > 0,
    reviewedLines: rules.filter((r) => r.reviewed).map((r) => ({ id: r.id, text: r.reason })),
    hasUnreviewed: rules.some((r) => !r.reviewed),
  };
}
