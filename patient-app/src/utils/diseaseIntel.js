// Rule-based observations for the disease areas. Readings are compared with the person's OWN usual ranges, nothing else.
// There is no model, no risk score and no diagnosis here, and the screens say so.
import { inRange } from './twin';

// One row per live metric of an organ: latest value, usual range, within / different / null (no reading yet).
export function metricStates(organ, { vitals, history, baseline }) {
  return organ.metrics.map((m) => {
    const series = m.series ? history[m.series] || [] : [];
    const latest = series.length ? series[series.length - 1] : null;
    const value = m.key === 'bp' ? latest : latest ?? (vitals && typeof vitals[m.key] === 'number' ? vitals[m.key] : null);
    const range = m.range && baseline ? baseline[m.range] : null;
    return { key: m.key, series: m.series, unit: m.unit, value, range, within: range && value != null ? inRange(value, range) : null };
  });
}

// Overall status of an area: 'nodata' (no live readings exist for it), 'waiting', 'different' or 'within'.
export function areaStatus(states) {
  const ranged = states.filter((s) => s.range);
  if (ranged.length === 0) return 'nodata';
  const known = ranged.filter((s) => s.within !== null);
  if (known.length === 0) return 'waiting';
  return known.some((s) => s.within === false) ? 'different' : 'within';
}

// How much to trust the observations: more readings, a usual range, and linked records raise it. Each missing piece is listed as a reason.
export function dataQuality({ hasMetrics, readings, hasBaseline, reports, conditions, labs = 0 }) {
  const reasons = [];
  let score = 0;
  if (!hasMetrics) reasons.push('noLive');
  else {
    if (readings >= 30) score += 2; else if (readings >= 10) score += 1; else reasons.push('fewReadings');
    if (hasBaseline) score += 1; else reasons.push('noBaseline');
  }
  if (reports > 0 || labs > 0) score += 1; else reasons.push('noReports');
  if (conditions > 0) score += 1;
  return { level: score >= 4 ? 'good' : score >= 2 ? 'medium' : 'low', reasons, score };
}
