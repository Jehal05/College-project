// "Take over": the desk wants to act on an alert that another hospital currently holds (seen under "All hospitals").
// Pure functions (tests: takeOver.test.js). The take-over is logged in the timeline as a desk note with the reason.
import { isElsewhere } from './queueScope.js';
import { isFinal, isEarly } from './stateMachine.js';

export const REASONS = ['demo', 'cannot-respond', 'nearer', 'other'];
export const MAX_REASON = 200;

/** Default reason: in mock mode the desk is demonstrating, so one click is enough. In real mode the desk must choose. */
export const defaultReason = (useMock) => (useMock ? 'demo' : '');

/** Does the desk have to take this alert over before it may acknowledge or dispatch? */
export function needsTakeOver(alert, hospitalId) {
  if (!alert || isFinal(alert.state) || isEarly(alert.state)) return false;
  if (!isElsewhere(alert, hospitalId)) return false;
  // Already taken over by this desk, and the alert has not moved since.
  const done = String(alert.taken_over_by ?? '') === String(hospitalId) && String(alert.taken_over_from ?? '') === String(alert.alerted_hospital_id);
  return !done;
}

/** Check the reason. `kind` is one of REASONS; for "other" the text is required. */
export function checkReason(kind, text = '', labels = {}) {
  if (!REASONS.includes(kind)) return { ok: false, reason: '', error: 'Choose a reason.' };
  const free = String(text ?? '').trim();
  if (free.length > MAX_REASON) return { ok: false, reason: '', error: `The reason is too long (${MAX_REASON} letters at most).` };
  if (kind === 'other' && !free) return { ok: false, reason: '', error: 'Write the reason.' };
  const label = kind === 'other' ? '' : labels[kind] || kind;
  const reason = [label, free].filter(Boolean).join(': ');
  return { ok: true, reason, error: null };
}

/** The timeline note. */
export const takeOverNote = (fromName, reason) => `Taken over from ${fromName || 'another hospital'}. Reason: ${reason}`;

/** Fields stored on the alert so the desk is not asked again until the alert moves. */
export const takeOverFields = (hospitalId, alert) => ({ taken_over_by: String(hospitalId), taken_over_from: String(alert.alerted_hospital_id) });
