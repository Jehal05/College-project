// Analytics maths (feature #30) and step durations (shared with the report, feature #31).
// Pure functions: no React, no network. Everything is worked out from the stored
// timeline events (status_events), never from hard-coded numbers.
import { EMERGENCY_TYPES, SEVERITY } from './contract.js';
import { isFinal } from './stateMachine.js';

export const STEPS = [
  { key: 'alert_to_ack', label: 'Alert to acknowledged', from: 'SOS_SENT', to: 'HOSPITAL_ACKNOWLEDGED' },
  { key: 'ack_to_dispatch', label: 'Acknowledged to dispatched', from: 'HOSPITAL_ACKNOWLEDGED', to: 'AMBULANCE_DISPATCHED' },
  { key: 'dispatch_to_arrival', label: 'Dispatched to arrived', from: 'AMBULANCE_DISPATCHED', to: 'ARRIVED' },
  { key: 'arrival_to_handover', label: 'Arrived to handed over', from: 'ARRIVED', to: 'HANDOVER_DONE' },
];

const ms = (t) => new Date(t).getTime();

/** Time (ms) of the first event with this state, or null. The alert time falls back to created_at. */
function firstTime(emergency, state) {
  const hit = (emergency.status_events || [])
    .filter((e) => e.state === state && Number.isFinite(ms(e.timestamp)))
    .map((e) => ms(e.timestamp))
    .sort((a, b) => a - b)[0];
  if (hit !== undefined) return hit;
  if (state === 'SOS_SENT' && Number.isFinite(ms(emergency.created_at))) return ms(emergency.created_at);
  return null;
}

/**
 * Seconds spent in each step of one emergency. A step the emergency never reached is null.
 * total = alert to the final event (handed over or cancelled), null while still open.
 */
export function stepDurations(emergency) {
  const out = {};
  for (const step of STEPS) {
    const a = firstTime(emergency, step.from);
    const b = firstTime(emergency, step.to);
    out[step.key] = a !== null && b !== null && b >= a ? Math.round((b - a) / 1000) : null;
  }
  const start = firstTime(emergency, 'SOS_SENT');
  const end = firstTime(emergency, emergency.state === 'CANCELLED' ? 'CANCELLED' : 'HANDOVER_DONE');
  out.total = isFinal(emergency.state) && start !== null && end !== null && end >= start ? Math.round((end - start) / 1000) : null;
  return out;
}

/** How many times the alert moved on to the next hospital. */
export function escalationCount(emergency) {
  const fromEvents = (emergency.status_events || []).filter((e) => e.state === 'ESCALATED').length;
  return Math.max(fromEvents, emergency.escalation_level || 0);
}

const countBy = (list, keys, pick) => {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of list) {
    const k = pick(item);
    if (k in out) out[k] += 1;
    else if (k) out[k] = 1;
  }
  return out;
};

/**
 * Everything the analytics page shows.
 * @param cases      list of emergencies (finished and open), each with status_events
 * @param ambulances optional list, used for call signs
 */
export function summarise(cases = [], ambulances = []) {
  const byType = countBy(cases, EMERGENCY_TYPES, (e) => e.type);
  const bySeverity = countBy(cases, SEVERITY.filter((s) => s !== 'NONE'), (e) => e.severity);
  const byState = {};
  for (const e of cases) byState[e.state] = (byState[e.state] || 0) + 1;

  const durations = cases.map(stepDurations);
  const averages = {};
  for (const step of STEPS) {
    const values = durations.map((d) => d[step.key]).filter((v) => v !== null);
    averages[step.key] = { count: values.length, seconds: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null };
  }
  const totals = durations.map((d) => d.total).filter((v) => v !== null);

  const escalated = cases.filter((e) => escalationCount(e) > 0);
  const withUnit = cases.filter((e) => e.ambulance_id);
  const perUnit = {};
  for (const e of withUnit) perUnit[e.ambulance_id] = (perUnit[e.ambulance_id] || 0) + 1;
  const name = (id) => ambulances.find((a) => a.id === id)?.call_sign || id;
  const units = Object.entries(perUnit)
    .map(([id, trips]) => ({ id, name: name(id), trips }))
    .sort((a, b) => b.trips - a.trips || a.id.localeCompare(b.id));

  return {
    total: cases.length,
    finished: cases.filter((e) => e.state === 'HANDOVER_DONE').length,
    cancelled: cases.filter((e) => e.state === 'CANCELLED').length,
    open: cases.filter((e) => !isFinal(e.state)).length,
    byType,
    bySeverity,
    byState,
    averages,
    averageTotal: { count: totals.length, seconds: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null },
    escalations: { cases: escalated.length, times: escalated.reduce((n, e) => n + escalationCount(e), 0) },
    ambulance: { trips: withUnit.length, units },
  };
}
