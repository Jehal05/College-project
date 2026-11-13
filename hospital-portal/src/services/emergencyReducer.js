// Pure functions that keep the list of emergencies up to date.
// No React in here, so it is easy to test (see emergencyReducer.test.js).
import { isFinal } from './stateMachine.js';
import { canEscalate } from './escalation.js';

const SEVERITY_ORDER = ['EMERGENCY', 'URGENT', 'WATCH', 'NONE'];

/** Make sure every emergency has a status_events list (the timeline data). */
export function normalise(e) {
  const created_at = e.created_at || new Date().toISOString();
  const events = e.status_events?.length ? e.status_events : e.timeline?.length ? e.timeline : null;
  return {
    ...e,
    created_at,
    state: e.state || 'SOS_SENT',
    alerted_ids: e.alerted_ids || [], // hospitals that were alerted and did not answer
    escalation_level: e.escalation_level || 0,
    checklist: e.checklist || {}, // { [item_id]: { done, by, at } }
    status_events: events ? [...events] : [{ state: 'SOS_SENT', timestamp: created_at, actor: 'Patient app' }],
  };
}

/**
 * Apply one WebSocket event { event, emergency_id, state, timestamp, payload }.
 * Returns the same list object when nothing changed.
 */
export function applyEvent(list, msg) {
  const { event, emergency_id, state, timestamp, payload = {} } = msg || {};
  if (!emergency_id) return list;
  const idx = list.findIndex((e) => e.emergency_id === emergency_id);

  if (event === 'emergency.created') {
    if (idx >= 0) return list; // already known
    const created = normalise({ created_at: timestamp, ...payload, emergency_id, state: state || 'SOS_SENT', _new: true });
    return [created, ...list];
  }

  if (idx < 0) return list; // unknown emergency
  const current = list[idx];
  const replace = (updated) => list.map((e, i) => (i === idx ? updated : e));

  // Which hospital has the alert now (no state change).
  if (event === 'hospital.alerted') {
    const hospitalId = payload.hospital_id;
    if (!hospitalId || hospitalId === current.alerted_hospital_id) return list;
    return replace({ ...current, alerted_hospital_id: hospitalId });
  }

  // No acknowledgement in time: the alert moved to the next hospital. Can happen more than once.
  if (event === 'hospital.escalated') {
    if (!canEscalate(current.state)) return list; // already acknowledged, cancelled or finished
    const level = payload.escalation_level ?? (current.state === 'ESCALATED' ? current.escalation_level : current.escalation_level + 1);
    if (level <= current.escalation_level) return list; // duplicate
    const from = payload.from_hospital_id || current.alerted_hospital_id;
    return replace({
      ...current,
      state: 'ESCALATED',
      escalation_level: level,
      alerted_ids: from && !current.alerted_ids.includes(from) ? [...current.alerted_ids, from] : current.alerted_ids,
      alerted_hospital_id: payload.to_hospital_id || current.alerted_hospital_id,
      escalated_to_name: payload.to_hospital_name || null,
      status_events: [
        ...current.status_events,
        {
          state: 'ESCALATED',
          timestamp: timestamp || new Date().toISOString(),
          actor: payload.actor || 'System',
          note: payload.to_hospital_name ? `Now alerting ${payload.to_hospital_name}` : null,
        },
      ],
    });
  }

  // A timeline note with no state change: patient picked up, corridor request, team assignment.
  if (event === 'emergency.note') {
    if (!payload.note) return list;
    const noteId = payload.note_id || `${timestamp}|${payload.note}`;
    if (current.status_events.some((e) => e.note_id === noteId)) return list; // duplicate
    return replace({
      ...current,
      ...(payload.fields || {}),
      status_events: [
        ...current.status_events,
        { state: 'NOTE', kind: payload.kind || null, note: payload.note, note_id: noteId, timestamp: timestamp || new Date().toISOString(), actor: payload.actor || null },
      ],
    });
  }

  // Ambulance position update. May also carry the change to EN_ROUTE.
  if (event === 'ambulance.location') {
    if (isFinal(current.state)) return list;
    const { actor: _actor, ...position } = payload;
    const moved = { ...current, ambulance: { ...current.ambulance, ...position, updated_at: timestamp || new Date().toISOString() } };
    if (payload.ambulance_id && !current.ambulance_id) moved.ambulance_id = payload.ambulance_id;
    if (state === 'EN_ROUTE' && current.state === 'AMBULANCE_DISPATCHED') {
      moved.state = 'EN_ROUTE';
      moved.status_events = [...current.status_events, { state: 'EN_ROUTE', timestamp: timestamp || new Date().toISOString(), actor: payload.actor || null }];
    }
    return replace(moved);
  }

  if (!state) return list; // an event without a state
  if (current.state === state) return list; // duplicate (e.g. our own click echoed back)
  if (isFinal(current.state)) return list; // a finished or cancelled emergency never changes

  const updated = {
    ...current,
    ...(payload.ambulance_id ? { ambulance_id: payload.ambulance_id } : {}),
    state,
    status_events: [
      ...current.status_events,
      { state, timestamp: timestamp || new Date().toISOString(), actor: payload.actor || null },
    ],
  };
  return replace(updated);
}

/** Merge fresh details from GET /emergencies/{id}. */
export function mergeDetails(list, detail) {
  return list.map((e) => {
    if (e.emergency_id !== detail?.emergency_id) return e;
    const merged = normalise({ ...e, ...detail, status_events: detail.status_events || detail.timeline || e.status_events });
    return { ...merged, _new: e._new, _read: e._read };
  });
}

/**
 * Priority queue (feature #59).
 * Open alerts first: by severity (EMERGENCY, URGENT, WATCH, NONE), then oldest first,
 * because the one waiting longest is the most overdue. Cancelled and finished alerts
 * go to the bottom, newest first. Nothing is ever hidden.
 */
export function sortForQueue(list) {
  const time = (e) => new Date(e.created_at).getTime();
  const severity = (e) => {
    const i = SEVERITY_ORDER.indexOf(e.severity);
    return i < 0 ? SEVERITY_ORDER.length : i;
  };
  return [...list].sort((a, b) => {
    const closedA = isFinal(a.state) ? 1 : 0;
    const closedB = isFinal(b.state) ? 1 : 0;
    if (closedA !== closedB) return closedA - closedB;
    if (closedA) return time(b) - time(a);
    return severity(a) - severity(b) || time(a) - time(b) || String(a.emergency_id).localeCompare(String(b.emergency_id));
  });
}

/** Open alerts nobody has opened yet. */
export const countUnread = (list) => list.filter((e) => !e._read && !isFinal(e.state)).length;

export function emergencyReducer(list, action) {
  switch (action.type) {
    case 'load': {
      // Keep the read marks when the list is reloaded (for example after a reconnect).
      const read = new Set(list.filter((e) => e._read).map((e) => e.emergency_id));
      return action.list.map((e) => ({ ...normalise(e), _read: read.has(e.emergency_id) }));
    }
    case 'read':
      return list.map((e) => (e.emergency_id === action.id && !e._read ? { ...e, _read: true } : e));
    case 'checklist':
      return list.map((e) => (e.emergency_id === action.id ? { ...e, checklist: action.checklist } : e));
    case 'event':
      return applyEvent(list, action.msg);
    case 'merge':
      return mergeDetails(list, action.detail);
    case 'clear':
      return [];
    default:
      return list;
  }
}
