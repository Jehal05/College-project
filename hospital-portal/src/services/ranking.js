// Hospital ranking (feature #15). Pure function: no React, no network.
//
// Step 1  FILTER  Unverified hospitals and hospitals missing a required capability are
//                 ruled out, with a reason. Distance can never bring them back.
// Step 2  SCORE   total = capability x 0.5 + travel time x 0.3 + availability x 0.2
//                 (weights come from data/ranking-config.json). Each part is 0 to 100.
import { haversineKm, simulatedTravelMinutes } from './geo.js';

const NAMES = { cath_lab: 'cath lab', stroke_unit: 'stroke unit', icu: 'ICU', emergency: 'emergency department' };
const round1 = (x) => Math.round(x * 10) / 10;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Is a required unit usable right now? */
function isReady(hospital, capability) {
  const a = hospital.availability || {};
  if (a.ready === false) return false; // the hospital says it is not accepting patients
  if (capability === 'cath_lab') return Boolean(a.cath_lab_ready);
  if (capability === 'stroke_unit') return Boolean(a.stroke_unit_ready);
  if (capability === 'icu') return a.icu_free == null ? a.ready !== false : a.icu_free > 0; // count not shared: trust the open/closed flag
  return true; // emergency department: open if the hospital has one
}

/**
 * @param hospitals        list from GET /hospitals
 * @param emergencyType    HEART | STROKE | DIABETIC | ASTHMA
 * @param patientLocation  { lat, lng }
 * @param config           contents of data/ranking-config.json
 * @returns { ranked: [...], ruledOut: [...], required: [...] }
 */
export function rankHospitals(hospitals, emergencyType, patientLocation, config) {
  const weights = config.weights;
  const scoring = { max_travel_minutes: 30, beds_for_full_score: 10, icu_for_full_score: 3, ...config.scoring };
  // A type with no (or an empty) capability list needs only an emergency department. This also avoids dividing by zero below.
  const listed = config.required_capabilities?.[emergencyType];
  const required = Array.isArray(listed) && listed.length > 0 ? listed : ['emergency'];
  const hasLocation = Number.isFinite(patientLocation?.lat) && Number.isFinite(patientLocation?.lng);

  const ranked = [];
  const ruledOut = [];

  for (const hospital of hospitals || []) {
    // ---- Step 1: filter
    if (config.only_verified_hospitals && !hospital.verified) {
      ruledOut.push({ hospital, reason: 'Not verified' });
      continue;
    }
    const missing = required.filter((cap) => !hospital.capabilities?.[cap]);
    if (missing.length > 0) {
      ruledOut.push({ hospital, reason: missing.map((cap) => `No ${NAMES[cap] || cap}`).join(', ') });
      continue;
    }

    // ---- Step 2: score (each part 0 to 100)
    const a = hospital.availability || {};
    // A hospital with no coordinates has an unknown travel time (never NaN).
    const canMeasure = hasLocation && Number.isFinite(hospital.lat) && Number.isFinite(hospital.lng);
    const distance_km = canMeasure ? round1(haversineKm(patientLocation, hospital)) : null;
    const eta_min = canMeasure ? simulatedTravelMinutes(distance_km) : null;

    const readyCount = required.filter((cap) => isReady(hospital, cap)).length;
    const capability = (readyCount / required.length) * 100;
    const travel_time = eta_min === null ? 0 : clamp01(1 - eta_min / scoring.max_travel_minutes) * 100;
    const availability =
      (clamp01((a.beds_free || 0) / scoring.beds_for_full_score) * 0.5 +
        clamp01((a.icu_free || 0) / scoring.icu_for_full_score) * 0.5) * 100;

    // Points each part adds to the total. The total is the sum of these three numbers.
    const points = {
      capability: round1(capability * weights.capability),
      travel_time: round1(travel_time * weights.travel_time),
      availability: round1(availability * weights.availability),
    };
    const total = round1(points.capability + points.travel_time + points.availability);

    const special = required.filter((cap) => cap !== 'emergency');
    const notReady = special.filter((cap) => !isReady(hospital, cap));
    const readiness =
      special.length === 0
        ? 'Has an emergency department'
        : notReady.length === 0
          ? `${capitalise(special.map((c) => NAMES[c]).join(' and '))} ready`
          : `${capitalise(notReady.map((c) => NAMES[c]).join(' and '))} not ready right now`;
    const why = [
      readiness,
      eta_min === null ? 'travel time unknown' : `${eta_min} min away (simulated)`,
      a.beds_free == null && a.icu_free == null ? 'bed numbers not shared' : `${a.beds_free || 0} beds and ${a.icu_free || 0} ICU beds free`,
    ].join(' · ');

    ranked.push({
      hospital,
      distance_km,
      eta_min,
      parts: { capability: round1(capability), travel_time: round1(travel_time), availability: round1(availability) },
      points,
      total,
      why,
    });
  }

  // Best score first. Ties: shorter travel time, then id, so the order is always the same.
  ranked.sort(
    (x, y) => y.total - x.total || (x.eta_min ?? Infinity) - (y.eta_min ?? Infinity) || String(x.hospital.id).localeCompare(String(y.hospital.id)),
  );
  ranked.forEach((row, i) => {
    row.rank = i + 1;
  });

  return { ranked, ruledOut, required };
}
