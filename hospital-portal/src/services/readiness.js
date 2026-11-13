// Pre-arrival readiness card (C3). Pure functions (tests: readiness.test.js).
// The card only uses what the alert already carries. The health passport is opened only when staff press the button,
// because the backend records every passport view.
import { NOT_SHARED } from './adapters.js';
import { isFinal } from './stateMachine.js';

/** "3 min 20 s" from seconds. */
export function etaText(seconds) {
  const s = Math.max(0, Math.round(Number(seconds)));
  if (!Number.isFinite(s)) return NOT_SHARED;
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** ETA line. Everything about the ambulance is simulated. */
export function etaLine(e) {
  if (e.state === 'ARRIVED' || e.state === 'HANDOVER_DONE') return { known: true, text: 'Arrived' };
  if (!e.ambulance_id) return { known: false, text: 'No ambulance sent yet' };
  const eta = e.ambulance?.eta_seconds;
  if (eta === undefined || eta === null || !Number.isFinite(Number(eta))) return { known: false, text: 'ETA not shared yet' };
  return { known: true, text: `${etaText(eta)} (simulated)` };
}

const vitalsText = (v) => {
  if (!v) return NOT_SHARED;
  const parts = [v.heart_rate != null && `HR ${v.heart_rate}`, v.spo2 != null && `SpO₂ ${v.spo2}%`, v.bp != null && `BP ${v.bp}`].filter(Boolean);
  return parts.length ? parts.join(', ') : NOT_SHARED;
};

/** What the patient's app already shared with the alert. Anything missing reads "Not shared". */
export function sharedFacts(e) {
  const symptoms = (e.symptoms || []).filter(Boolean);
  return [
    { key: 'patient', label: 'Patient ID', value: e.patient_id ?? NOT_SHARED },
    { key: 'symptoms', label: 'Symptoms', value: symptoms.length ? symptoms.join(', ') : NOT_SHARED },
    { key: 'vitals', label: 'Vitals', value: vitalsText(e.vitals) },
    { key: 'location', label: 'Location', value: e.location ? 'Shared' : NOT_SHARED },
  ];
}

/** @param items checklist items for this emergency type (from checklists.json) */
export function readinessCard(e, items = []) {
  const ticks = e.checklist || {};
  const done = items.filter((i) => ticks[i.id]?.done).length;
  const team = e.assigned_team;
  return {
    open: !isFinal(e.state),
    eta: etaLine(e),
    facts: sharedFacts(e),
    checklist: { done, total: items.length, text: items.length ? `${done} of ${items.length} done` : 'No checklist for this type' },
    team: team?.name ? { assigned: true, text: team.specialty ? `${team.name} (${team.specialty})` : team.name } : { assigned: false, text: 'No one assigned yet' },
  };
}

const list = (v) => (Array.isArray(v) && v.length ? v.join(', ') : NOT_SHARED);

/**
 * Rows for an opened passport. A field the patient did not consent to is OMITTED by the backend, so it reads "Not shared"
 * (an empty list that WAS sent reads "None recorded").
 */
export function passportRows(p) {
  if (!p || typeof p !== 'object') return [];
  const has = (k) => Object.prototype.hasOwnProperty.call(p, k) && p[k] !== null && p[k] !== undefined;
  const listRow = (k) => (!has(k) ? NOT_SHARED : Array.isArray(p[k]) && p[k].length === 0 ? 'None recorded' : list(p[k]));
  return [
    { key: 'name', label: 'Name', value: has('name') ? String(p.name) : NOT_SHARED },
    { key: 'age', label: 'Age', value: has('age') ? String(p.age) : NOT_SHARED },
    { key: 'blood_group', label: 'Blood group', value: has('blood_group') ? String(p.blood_group) : NOT_SHARED },
    { key: 'conditions', label: 'Conditions', value: listRow('conditions') },
    { key: 'allergies', label: 'Allergies', value: listRow('allergies') },
    { key: 'contacts', label: 'Emergency contacts', value: !has('contacts') ? NOT_SHARED : p.contacts.length ? `${p.contacts.length} listed` : 'None recorded' },
    { key: 'reports', label: 'Reports', value: !has('reports') ? NOT_SHARED : p.reports.length ? p.reports.map((r) => r.name || r.id).join(', ') : 'None recorded' },
  ];
}

/** Plain words for a failed passport call. */
export function passportError(err) {
  const status = err?.status;
  if (status === 401) return { kind: 'login', text: 'Your login has expired or is missing. Log in again, then open the passport again.' };
  if (status === 403) return { kind: 'forbidden', text: 'This account is not allowed to open this passport. Only hospital staff can.' };
  if (status === 404) return { kind: 'not_found', text: 'No passport was found for this patient (or the backend has no passport endpoint yet).' };
  return { kind: 'error', text: `Could not open the passport: ${err?.message || 'unknown error'}` };
}
