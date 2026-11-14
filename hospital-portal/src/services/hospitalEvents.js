// Live availability changes from the backend (event hospital.availability_updated).
// Pure: no config, no network. Used by HospitalProvider.
// Payload: { hospital_id, availability } with our names (beds_free, icu_free, cath_lab_ready, stroke_unit_ready)
// and/or Daksh's names (icu_beds, cath_lab_open, stroke_unit_open). Only the keys that are sent change.

const ALIASES = { icu_beds: 'icu_free', cath_lab_open: 'cath_lab_ready', stroke_unit_open: 'stroke_unit_ready' };
const KEYS = ['beds_free', 'icu_free', 'cath_lab_ready', 'stroke_unit_ready'];

/** Keep only known keys, under our names. Our name wins if both are sent. */
export function pickAvailability(given) {
  if (!given || typeof given !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(ALIASES)) if (given[k] !== undefined) out[v] = given[k];
  for (const k of KEYS) if (given[k] !== undefined) out[k] = given[k];
  if (out.cath_lab_ready !== undefined) out.cath_lab_ready = Boolean(out.cath_lab_ready);
  if (out.stroke_unit_ready !== undefined) out.stroke_unit_ready = Boolean(out.stroke_unit_ready);
  return out;
}

/** Returns a new list, or the same list when nothing changed (unknown hospital, empty payload). */
export function applyAvailabilityUpdate(hospitals, payload) {
  const id = payload?.hospital_id;
  if (id === undefined || id === null) return hospitals;
  const change = pickAvailability(payload.availability);
  if (!Object.keys(change).length) return hospitals;
  let found = false;
  const next = hospitals.map((h) => {
    if (String(h.id) !== String(id)) return h;
    found = true;
    return { ...h, availability: { ...h.availability, ...change } };
  });
  return found ? next : hospitals;
}
