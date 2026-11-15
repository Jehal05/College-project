// The "at a glance" facts of the command view (Phase 4). Pure functions, no React: tests in commandView.test.js.
//   ackStatus      who acknowledged and when, or how long the alert has waited
//   sharedFields   which kinds of patient data the patient released to the hospital, and which not
//   ambulanceBrief what the desk may say about the ambulance (always simulated)
//   responseLog    one list in time order: state changes, notes AND checklist ticks
// Nothing here invents a value: a missing fact is returned as null and the screen says "not shared".

/** The patient data kinds a hospital may receive (the backend's consent names, CONTRACT.md). */
export const CONSENT_KEYS = ['location', 'history', 'vitals', 'reports'];

const ms = (iso) => {
  const n = new Date(iso).getTime();
  return Number.isNaN(n) ? null : n;
};
const seconds = (fromMs, toMs) => (fromMs === null || toMs === null ? null : Math.max(0, Math.round((toMs - fromMs) / 1000)));
const lastOf = (events, state) => [...events].reverse().find((e) => e.state === state) || null;

/**
 * @returns {{ kind: 'early'|'waiting'|'escalated'|'acknowledged'|'cancelled', by: string|null, at: string|null, waited: number|null }}
 *   waited = seconds from the alert to the acknowledgement; for 'waiting' and 'escalated' = seconds since the alert so far
 */
export function ackStatus(emergency, nowMs = Date.now()) {
  const events = emergency.status_events || [];
  const sosAt = ms(lastOf(events, 'SOS_SENT')?.timestamp ?? emergency.created_at);
  const ack = events.find((e) => e.state === 'HOSPITAL_ACKNOWLEDGED') || null;
  if (ack) return { kind: 'acknowledged', by: ack.actor || null, at: ack.timestamp, waited: seconds(sosAt, ms(ack.timestamp)) };
  const state = emergency.state;
  if (state === 'CANCELLED') return { kind: 'cancelled', by: null, at: lastOf(events, 'CANCELLED')?.timestamp ?? null, waited: null };
  if (['MONITORING', 'SYMPTOMS_REPORTED', 'EMERGENCY_DETECTED'].includes(state)) return { kind: 'early', by: null, at: null, waited: null };
  const kind = state === 'ESCALATED' ? 'escalated' : 'waiting';
  return { kind, by: null, at: null, waited: seconds(sosAt, nowMs) };
}

/**
 * Which data the patient released to this desk. `consents` comes with the alert.
 * @returns {{ key: string, shared: boolean|null }[]}  shared === null: the server did not say (never shown as "shared")
 */
export function sharedFields(emergency) {
  const c = emergency.consents && typeof emergency.consents === 'object' ? emergency.consents : null;
  return CONSENT_KEYS.map((key) => ({ key, shared: c && typeof c[key] === 'boolean' ? c[key] : null }));
}

const STATUS_FOR_STATE = { AMBULANCE_DISPATCHED: 'dispatched', EN_ROUTE: 'en_route', ARRIVED: 'at_hospital' };

/**
 * @returns {{ assigned: boolean, id: string|null, status: 'dispatched'|'en_route'|'at_hospital'|null, etaSeconds: number|null, simulated: true }}
 */
export function ambulanceBrief(emergency) {
  const amb = emergency.ambulance && typeof emergency.ambulance === 'object' ? emergency.ambulance : null;
  const id = emergency.ambulance_id ?? amb?.id ?? null;
  const rawEta = amb?.eta_seconds ?? emergency.eta_seconds;
  const eta = rawEta === null || rawEta === undefined || rawEta === '' ? NaN : Number(rawEta);
  const status = STATUS_FOR_STATE[emergency.state] || null;
  return {
    assigned: Boolean(id) || status !== null,
    id,
    status,
    etaSeconds: status === 'at_hospital' ? 0 : Number.isFinite(eta) ? eta : null,
    simulated: true,
  };
}

/**
 * Everything the desk did or saw, oldest first.
 * @param checklistItems [{ id, label }] the items of this emergency type (so a tick can be named)
 * @returns {{ at: string, kind: 'state'|'note'|'check', state?: string, text?: string, item?: string, label?: string, done?: boolean, by: string|null, local?: boolean }[]}
 */
export function responseLog(emergency, checklistItems = []) {
  const rows = [];
  for (const e of emergency.status_events || []) {
    if (ms(e.timestamp) === null) continue;
    if (e.state === 'NOTE') rows.push({ at: e.timestamp, kind: 'note', noteKind: e.kind || null, text: e.note || '', by: e.actor || null, local: Boolean(e.local_only) });
    else rows.push({ at: e.timestamp, kind: 'state', state: e.state, text: e.note || null, by: e.actor || null });
  }
  const names = new Map(checklistItems.map((i) => [i.id, i.label]));
  for (const [id, tick] of Object.entries(emergency.checklist || {})) {
    if (!tick || ms(tick.at) === null) continue;
    rows.push({ at: tick.at, kind: 'check', item: id, label: names.get(id) || id, done: Boolean(tick.done), by: tick.by || null });
  }
  return rows.map((r, i) => ({ ...r, i })).sort((a, b) => ms(a.at) - ms(b.at) || a.i - b.i).map(({ i, ...r }) => r);
}
