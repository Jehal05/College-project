// Helpers for auto-escalation (feature #43). Pure functions.
// The 30-second scheduler itself runs in Daksh's backend (and in mockBackend.js in mock mode).

export const UNACKNOWLEDGED_STATES = ['SOS_SENT', 'ESCALATED'];
export const canEscalate = (state) => UNACKNOWLEDGED_STATES.includes(state);

/** Time (ms) the currently alerted hospital received the alert. */
export function lastAlertTime(emergency) {
  const events = emergency.status_events || [];
  for (let i = events.length - 1; i >= 0; i--) {
    if (UNACKNOWLEDGED_STATES.includes(events[i].state)) return new Date(events[i].timestamp).getTime();
  }
  return new Date(emergency.created_at).getTime();
}

/** Whole seconds until escalation (0 when due). null when the alert is no longer waiting. */
export function secondsLeft(emergency, nowMs, limitSeconds) {
  if (!canEscalate(emergency.state)) return null;
  const left = limitSeconds - (nowMs - lastAlertTime(emergency)) / 1000;
  return Math.max(0, Math.ceil(left));
}

/**
 * Fallback list: what is happening at each ranked hospital for this emergency.
 * Returns { [hospital_id]: 'no_answer' | 'alerted' | 'next' | 'later' | 'responding' | 'not_needed' }
 */
export function fallbackStatuses(ranked, emergency) {
  const ids = ranked.map((r) => r.hospital.id);
  const past = emergency.alerted_ids || [];
  const current = emergency.alerted_hospital_id || ids.find((id) => !past.includes(id));
  const waiting = canEscalate(emergency.state);
  const cancelled = emergency.state === 'CANCELLED';
  const out = {};
  let nextGiven = false;
  for (const id of ids) {
    if (past.includes(id)) out[id] = 'no_answer';
    else if (id === current) out[id] = waiting ? 'alerted' : cancelled ? 'not_needed' : 'responding';
    else if (!waiting) out[id] = 'not_needed';
    else if (!nextGiven) {
      out[id] = 'next';
      nextGiven = true;
    } else out[id] = 'later';
  }
  return out;
}

/** The hospital that would be alerted next, or null if the list is used up. */
export function nextHospital(ranked, emergency) {
  const statuses = fallbackStatuses(ranked, emergency);
  return ranked.find((r) => statuses[r.hospital.id] === 'next')?.hospital || null;
}
