// Pre-arrival readiness card (C3). Pure functions (tests: readiness.test.js).
// The card only uses what the alert already carries. The health passport is opened only when staff press the button,
// because the backend records every passport view.
import { NOT_SHARED } from './adapters.js';
import { isFinal } from './stateMachine.js';

// `t` is an optional translate function (from useT). Without it every text stays English, exactly as before.
const L = (t, key, english, vars) => {
  if (!t) return english;
  const v = t(key, vars);
  return v === key ? english : v;
};

/** "3 min 20 s" from seconds. */
export function etaText(seconds, t) {
  const s = Math.max(0, Math.round(Number(seconds)));
  if (!Number.isFinite(s)) return L(t, 'common.notShared', NOT_SHARED);
  if (s < 60) return L(t, 'dur.sec', `${s} s`, { s });
  const m = Math.floor(s / 60);
  if (m < 60) return L(t, 'dur.minSec', `${m} min ${s % 60} s`, { m, s: s % 60 });
  return L(t, 'dur.hourMin', `${Math.floor(m / 60)} h ${m % 60} min`, { h: Math.floor(m / 60), m: m % 60 });
}

/** ETA line. Everything about the ambulance is simulated. */
export function etaLine(e, t) {
  if (e.state === 'ARRIVED' || e.state === 'HANDOVER_DONE') return { known: true, text: L(t, 'tk.arrived', 'Arrived') };
  if (!e.ambulance_id) return { known: false, text: L(t, 'rd.noAmbulance', 'No ambulance sent yet') };
  const eta = e.ambulance?.eta_seconds;
  if (eta === undefined || eta === null || !Number.isFinite(Number(eta))) return { known: false, text: L(t, 'rd.etaUnknown', 'ETA not shared yet') };
  return { known: true, text: L(t, 'rd.etaSim', `${etaText(eta)} (simulated)`, { time: etaText(eta, t) }) };
}

const vitalsText = (v, t) => {
  if (!v) return L(t, 'common.notShared', NOT_SHARED);
  const parts = [v.heart_rate != null && `HR ${v.heart_rate}`, v.spo2 != null && `SpO₂ ${v.spo2}%`, v.bp != null && `BP ${v.bp}`].filter(Boolean);
  return parts.length ? parts.join(', ') : L(t, 'common.notShared', NOT_SHARED);
};

/** What the patient's app already shared with the alert. Anything missing reads "Not shared". */
export function sharedFacts(e, t) {
  const symptoms = (e.symptoms || []).filter(Boolean);
  return [
    { key: 'patient', label: 'Patient ID', value: e.patient_id ?? L(t, 'common.notShared', NOT_SHARED) },
    { key: 'symptoms', label: 'Symptoms', value: symptoms.length ? symptoms.join(', ') : L(t, 'common.notShared', NOT_SHARED) },
    { key: 'vitals', label: 'Vitals', value: vitalsText(e.vitals, t) },
    { key: 'location', label: 'Location', value: e.location ? L(t, 'rd.shared', 'Shared') : L(t, 'common.notShared', NOT_SHARED) },
  ];
}

/** @param items checklist items for this emergency type (from checklists.json) */
export function readinessCard(e, items = [], t) {
  const ticks = e.checklist || {};
  const done = items.filter((i) => ticks[i.id]?.done).length;
  const team = e.assigned_team;
  return {
    open: !isFinal(e.state),
    eta: etaLine(e, t),
    facts: sharedFacts(e, t),
    checklist: { done, total: items.length, text: items.length ? L(t, 'rd.checklistDone', `${done} of ${items.length} done`, { done, total: items.length }) : L(t, 'rd.noChecklist', 'No checklist for this type') },
    team: team?.name ? { assigned: true, text: team.specialty ? `${team.name} (${team.specialty})` : team.name } : { assigned: false, text: L(t, 'rd.noTeam', 'No one assigned yet') },
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
