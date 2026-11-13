// Pure functions that keep the list of emergencies up to date.
// No React in here, so it is easy to test (see emergencyReducer.test.js).
import { isFinal } from './stateMachine.js';

/** Make sure every emergency has a status_events list (the timeline data). */
export function normalise(e) {
  const created_at = e.created_at || new Date().toISOString();
  const events = e.status_events?.length ? e.status_events : e.timeline?.length ? e.timeline : null;
  return {
    ...e,
    created_at,
    state: e.state || 'SOS_SENT',
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

  if (idx < 0 || !state) return list; // unknown emergency, or an event without a state
  const current = list[idx];
  if (current.state === state) return list; // duplicate (e.g. our own click echoed back)
  if (isFinal(current.state)) return list; // a finished or cancelled emergency never changes

  const updated = {
    ...current,
    state,
    status_events: [
      ...current.status_events,
      { state, timestamp: timestamp || new Date().toISOString(), actor: payload.actor || null },
    ],
  };
  return list.map((e, i) => (i === idx ? updated : e));
}

/** Merge fresh details from GET /emergencies/{id}. */
export function mergeDetails(list, detail) {
  return list.map((e) => {
    if (e.emergency_id !== detail?.emergency_id) return e;
    const merged = normalise({ ...e, ...detail, status_events: detail.status_events || detail.timeline || e.status_events });
    return { ...merged, _new: e._new };
  });
}

/** Queue order: open alerts first (newest on top), then cancelled and finished ones. */
export function sortForQueue(list) {
  const time = (e) => new Date(e.created_at).getTime();
  return [...list].sort((a, b) => {
    const closedA = isFinal(a.state) ? 1 : 0;
    const closedB = isFinal(b.state) ? 1 : 0;
    return closedA - closedB || time(b) - time(a);
  });
}

export function emergencyReducer(list, action) {
  switch (action.type) {
    case 'load':
      return action.list.map(normalise);
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
