// This desk's own hospital: capacity strip and "not ready for this alert" warnings (C2). Pure functions (tests: capacity.test.js).
// Missing numbers are never invented: they read "Not shared".
import { NOT_SHARED } from './adapters.js';
import { REQUIRED_CAPABILITIES } from './contract.js';

const count = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);

/** One unit (cath lab, stroke unit): 'Ready', 'Not ready' or 'No <unit>' when the hospital does not have it. */
function unit(hospital, capability, flag, noun) {
  if (!hospital?.capabilities?.[capability]) return { text: `No ${noun}`, state: 'absent' };
  const v = hospital.availability?.[flag];
  if (v === undefined || v === null) return { text: NOT_SHARED, state: 'unknown' };
  return v ? { text: 'Ready', state: 'ready' } : { text: 'Not ready', state: 'not_ready' };
}

/** Everything the capacity strip shows, as plain data. */
export function capacityView(hospital) {
  if (!hospital) return null;
  const a = hospital.availability && typeof hospital.availability === 'object' ? hospital.availability : null;
  const beds = count(a?.beds_free);
  const icu = count(a?.icu_free);
  return {
    name: hospital.name,
    accepting: a?.ready !== false, // availability.ready === false means "not taking new emergencies"
    beds: { value: beds, text: beds === null ? NOT_SHARED : String(beds) },
    icu: hospital.capabilities?.icu === false ? { value: null, text: 'No ICU' } : { value: icu, text: icu === null ? NOT_SHARED : String(icu) },
    cath: unit(hospital, 'cath_lab', 'cath_lab_ready', 'cath lab'),
    stroke: unit(hospital, 'stroke_unit', 'stroke_unit_ready', 'stroke unit'),
  };
}

/**
 * Warnings for one alert held by this desk's hospital.
 * @returns {{ level: 'warning'|'info', code: string, text: string }[]}   empty = nothing to warn about
 */
export function readinessWarnings(emergency, hospital) {
  if (!emergency || !hospital) return [];
  const need = REQUIRED_CAPABILITIES[emergency.type] || REQUIRED_CAPABILITIES.UNKNOWN; // unknown type: only an emergency department
  const v = capacityView(hospital);
  const out = [];
  if (!v.accepting) out.push({ level: 'warning', code: 'not_accepting', text: 'Your hospital is marked as not ready for new emergencies.' });
  if (need.includes('cath_lab')) {
    if (v.cath.state === 'absent') out.push({ level: 'warning', code: 'no_cath', text: 'Your hospital has no cath lab for this alert.' });
    else if (v.cath.state === 'not_ready') out.push({ level: 'warning', code: 'cath_not_ready', text: 'Your cath lab is not ready for this alert.' });
    else if (v.cath.state === 'unknown') out.push({ level: 'info', code: 'cath_unknown', text: 'Cath lab readiness is not shared, so it cannot be checked.' });
  }
  if (need.includes('stroke_unit')) {
    if (v.stroke.state === 'absent') out.push({ level: 'warning', code: 'no_stroke', text: 'Your hospital has no stroke unit for this alert.' });
    else if (v.stroke.state === 'not_ready') out.push({ level: 'warning', code: 'stroke_not_ready', text: 'Your stroke unit is not ready for this alert.' });
    else if (v.stroke.state === 'unknown') out.push({ level: 'info', code: 'stroke_unknown', text: 'Stroke unit readiness is not shared, so it cannot be checked.' });
  }
  if (need.includes('icu')) {
    if (hospital.capabilities?.icu === false) out.push({ level: 'warning', code: 'no_icu', text: 'Your hospital has no ICU for this alert.' });
    else if (v.icu.value === 0) out.push({ level: 'warning', code: 'icu_full', text: 'Your ICU has no free bed for this alert.' });
    else if (v.icu.value === null) out.push({ level: 'info', code: 'icu_unknown', text: 'ICU beds are not shared, so they cannot be checked.' });
  }
  if (need.includes('emergency') && hospital.capabilities?.emergency === false) {
    out.push({ level: 'warning', code: 'no_emergency', text: 'Your hospital has no emergency department.' });
  }
  return out;
}

/** The code of the warning the alert card shows (for the translated card sentence), or null. */
export const cardWarningCode = (emergency, hospital) => readinessWarnings(emergency, hospital).find((w) => w.level === 'warning')?.code || null;

/** The one short line for an alert card, or null. Only real warnings (not "not shared" notes). */
export const cardWarning = (emergency, hospital) => readinessWarnings(emergency, hospital).find((w) => w.level === 'warning')?.text.replace(/ for this alert\.$/, '.').replace(/^Your /, '') || null;
