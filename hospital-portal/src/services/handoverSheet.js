// Shift-handover sheet: every OPEN case with its handover notes, ready to print on one page.
// Pure (tests: handoverSheet.test.js). Early notices are not real alerts yet, so they are left out.
import { handoverNotes } from './notes.js';
import { isFinal, isEarly } from './stateMachine.js';
import { TYPE_LABELS } from './contract.js';

const RANK = { EMERGENCY: 0, URGENT: 1, WARNING: 1, NONE: 2 };
const sev = (e) => (e.severity in RANK ? RANK[e.severity] : 3);

/** @param {object[]} emergencies  @param {(id: string) => string} [hospitalName] */
export function handoverSheet(emergencies, hospitalName = (id) => id) {
  const open = (emergencies || []).filter((e) => !isFinal(e.state) && !isEarly(e.state));
  const cases = open
    .map((e) => ({
      emergency_id: e.emergency_id,
      patient_id: e.patient_id ?? null,
      type_label: TYPE_LABELS[e.type] || e.type || '',
      severity: e.severity ?? null,
      state: e.state,
      hospital: e.alerted_hospital_id ? hospitalName(e.alerted_hospital_id) : null,
      created_at: e.created_at ?? null,
      notes: handoverNotes(e.status_events || []),
    }))
    .sort((a, b) => sev(a) - sev(b) || new Date(a.created_at || 0) - new Date(b.created_at || 0));
  return { cases, withNotes: cases.filter((c) => c.notes.length > 0).length, noteCount: cases.reduce((n, c) => n + c.notes.length, 0) };
}

/** A list item from the real backend may carry no timeline yet; the page asks for the full details once. */
export const needsDetails = (e) => (e?.status_events || []).length <= 1;
