// The ONE place in the app that translates between the app's names and the shapes other systems use.
// Today: blood pressure. The live vitals event carries "bp": "120/80" and, from Phase 6, also bp_sys and bp_dia
// (Daksh's backend uses bp_sys / bp_dia). Symptom IDs stay UPPER_SNAKE_CASE here; the server maps them for the rules engine.
export function bpParts(bp) {
  const [sys, dia] = String(bp || '').split('/').map(Number);
  return Number.isFinite(sys) && Number.isFinite(dia) ? { bp_sys: sys, bp_dia: dia } : {};
}

const KEYS = ['heart_rate', 'spo2', 'glucose'];

// A vitals.update payload -> { heart_rate, spo2, bp_sys, bp_dia, glucose } with numbers only (missing ones left out).
export function readingFromPayload(payload) {
  const out = {};
  KEYS.forEach((k) => { if (typeof payload[k] === 'number') out[k] = payload[k]; });
  const bp = typeof payload.bp_sys === 'number' && typeof payload.bp_dia === 'number'
    ? { bp_sys: payload.bp_sys, bp_dia: payload.bp_dia } : bpParts(payload.bp);
  return { ...out, ...bp };
}

// Daksh's backend names the event type `event` (we use `type`) and the emergency history `timeline` (we use `status_events`).
export const normalizeEvent = (e) => (e && e.type === undefined && e.event !== undefined ? { ...e, type: e.event } : e);
export const normalizeEmergency = (e) => (e && !e.status_events && Array.isArray(e.timeline)
  ? { ...e, status_events: e.timeline.map(({ state, timestamp }) => ({ state, timestamp })) } : e);
