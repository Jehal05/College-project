// Case history helpers (feature #48). Pure functions.
import { isFinal } from './stateMachine.js';
import { TYPE_LABELS } from './contract.js';

/** Same emergency id can be reused after a mock restart, so the key includes the alert time. */
export const caseKey = (e) => `${e.emergency_id}|${e.created_at}`;

/** Merge stored past cases with the live list. The version with more timeline events wins. */
export function mergeCases(stored = [], live = []) {
  const map = new Map();
  for (const e of [...stored, ...live]) {
    const key = caseKey(e);
    const old = map.get(key);
    const size = (x) => (x.status_events || []).length;
    if (!old || size(e) >= size(old)) map.set(key, old ? { ...old, ...e } : e);
  }
  return [...map.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || String(b.emergency_id).localeCompare(String(a.emergency_id)));
}

const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * filters: { text, type, severity, state, from, to, hospital }
 *   state: 'finished' (default: handed over or cancelled), 'open', 'all' or one exact state
 *   from / to: 'YYYY-MM-DD' (local days, both included)
 */
export function filterCases(cases, filters = {}, hospitals = []) {
  const { text = '', type = '', severity = '', state = 'finished', from = '', to = '', hospital = '' } = filters;
  const q = text.trim().toLowerCase();
  const nameOf = (id) => hospitals.find((h) => h.id === id)?.name || '';
  return cases.filter((e) => {
    if (type && e.type !== type) return false;
    if (severity && e.severity !== severity) return false;
    if (hospital && e.alerted_hospital_id !== hospital) return false;
    if (state === 'finished' && !isFinal(e.state)) return false;
    if (state === 'open' && isFinal(e.state)) return false;
    if (!['finished', 'open', 'all', ''].includes(state) && e.state !== state) return false;
    const day = localDay(e.created_at);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (q) {
      const hay = [e.emergency_id, e.patient_id, TYPE_LABELS[e.type], e.type, nameOf(e.alerted_hospital_id), ...(e.symptoms || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
