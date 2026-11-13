const { symptomLabels } = require('./adapters');
// Builds the payload of the emergency.created event. Pure function (no I/O) so it can be unit tested.
// Rule: a field the patient did not agree to share is LEFT OUT (never null, never empty). See docs/API_CONTRACT.md.
const ALWAYS = ['id', 'name', 'age', 'sex'];
const HISTORY = ['blood_group', 'allergies', 'conditions', 'medications'];

function buildCreatedPayload({ emergency, patient, hospital, rank, vitals }) {
  const consents = { ...(patient && patient.consents), ...(emergency.consents || {}) };
  const payload = {
    type: emergency.type, severity: emergency.severity, symptoms: symptomLabels(emergency.symptoms), symptom_ids: emergency.symptoms || [], source: emergency.source,
    patient_id: emergency.patient_id, created_at: emergency.status_events[0].timestamp, simulated: true,
    reasons: emergency.reasons, consents,
    passport_available: Boolean(consents.history), // can staff open the health passport? (GET /passport/{patient_id}, honours the history consent)
  };
  if (patient) {
    const p = {};
    ALWAYS.forEach((k) => { if (patient[k] !== undefined && patient[k] !== null) p[k] = patient[k]; });
    if (consents.history) HISTORY.forEach((k) => { if (patient[k] !== undefined && patient[k] !== null) p[k] = patient[k]; });
    payload.patient = p;
    payload.patient_summary = { name: patient.name, age: patient.age, blood_group: patient.blood_group }; // always allowed (Daksh)
  }
  const loc = emergency.location;
  if (consents.location && loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    payload.location = { lat: loc.lat, lng: loc.lng, ...(Number.isFinite(loc.accuracy) ? { accuracy: loc.accuracy } : {}) };
  }
  if (consents.vitals && vitals) {
    const { timestamp, ...readings } = vitals;
    payload.vitals = { ...readings, ...(Number.isFinite(readings.bp_sys) && Number.isFinite(readings.bp_dia) ? { bp: readings.bp_sys + '/' + readings.bp_dia } : {}) };
  }
  if (hospital) payload.hospital = { id: hospital.id, name: hospital.name, distance_km: hospital.distance_km, ...(rank ? { rank } : {}) };
  return payload;
}

module.exports = { buildCreatedPayload };
