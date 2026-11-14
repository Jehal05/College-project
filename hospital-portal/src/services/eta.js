// Estimated time of arrival text for the tracking map and the fleet page. Pure (tests: eta.test.js).
/** @param t optional translate function (from useT). Without it the text is English ("1 min 05 s"). */
export function formatEta(seconds, t) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rest = String(s % 60).padStart(2, '0');
  if (!t) return s < 60 ? `${s} s` : `${m} min ${rest} s`;
  return s < 60 ? t('dur.sec', { s }) : t('dur.minSec', { m, s: rest });
}

const L = (t, key, english, vars) => {
  if (!t) return english;
  const v = t(key, vars);
  return v === key ? english : v;
};

/**
 * The line under the ETA on the tracking map. A real backend may send no remaining_km, so the distance is left out then
 * (it used to read "undefined km left").
 * @param ambulance the emergency's ambulance object (leg, remaining_km), or undefined
 */
export function legText({ arrived, live, ambulance }, t) {
  if (arrived) return L(t, 'tk.atHospital', 'Ambulance is at the hospital');
  if (!live) return L(t, 'tk.assigned', 'Ambulance assigned, about to leave');
  const km = ambulance?.remaining_km;
  const known = km !== undefined && km !== null && Number.isFinite(Number(km));
  if (ambulance?.leg === 'to_patient') {
    return known ? L(t, 'tk.toPatient', `Heading to the patient · ${km} km left in total`, { km }) : L(t, 'tk.toPatientNoKm', 'Heading to the patient');
  }
  return known
    ? L(t, 'tk.onBoard', `Patient on board · heading to the hospital · ${km} km left`, { km })
    : L(t, 'tk.onBoardNoKm', 'Patient on board · heading to the hospital');
}
