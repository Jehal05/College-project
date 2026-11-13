// Pure functions that keep the list of emergencies up to date.
// No React in here, so it is easy to test (see emergencyReducer.test.js).
import { isFinal, isEarly } from './stateMachine.js';
import { withMotion } from './adapters.js';
import { inScope } from './queueScope.js';

// Local receive time of an event (ms). The socket adds received_at; without it we fall back to the event's own timestamp.
const receivedMs = (msg) => (Number.isFinite(msg?.received_at) ? msg.received_at : new Date(msg?.timestamp || Date.now()).getTime());
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
    status_events: events ? [...events] : [{ state: e.state || 'SOS_SENT', timestamp: created_at, actor: 'Patient app' }],
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
    const s = state || 'SOS_SENT';
    // An early notice (patient has not confirmed yet) is not "new" in the loud sense: no flash.
    const real = !isEarly(s) && !isFinal(s);
    const created = normalise({
      created_at: timestamp,
      ...payload,
      emergency_id,
      state: s,
      _new: real,
      // When it became a real SOS here: the card flashes from this moment, not from when the case was created.
      ...(real ? { sos_sent_at: timestamp || new Date().toISOString(), flash_from: receivedMs(msg) } : {}),
    });
    return [created, ...list];
  }

  if (idx < 0) return list; // unknown emergency
  const current = list[idx];
  const replace = (updated) => list.map((e, i) => (i === idx ? updated : e));

  // Which hospital has the alert now (no state change).
  if (event === 'hospital.alerted') {
    const hospitalId = payload.hospital_id;
    if (!hospitalId || hospitalId === current.alerted_hospital_id) return list;
    return replace({ ...current, alerted_hospital_id: hospitalId, ...(payload.hospital_name ? { alerted_hospital_name: payload.hospital_name } : {}) });
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
      // It is a new alert for the hospital it moved to: unread again, flash again.
      _new: true,
      _read: false,
      escalated_at: timestamp || new Date().toISOString(),
      flash_from: receivedMs(msg),
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
    // The backend may send only lat, lng and ETA. Heading and progress are worked out here.
    const motion = withMotion(current.ambulance, position);
    const moved = { ...current, ambulance: { ...current.ambulance, ...motion, updated_at: timestamp || new Date().toISOString() } };
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
    // The patient confirmed the SOS: from now on it is a real alert for the desk (flash, sound, unread).
    ...(isEarly(current.state) && state === 'SOS_SENT'
      ? { _new: true, _read: false, sos_sent_at: timestamp || new Date().toISOString(), flash_from: receivedMs(msg) }
      : {}),
    ...(state === 'CANCELLED' ? { _new: false } : {}),
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
    // Fields the detail does not have (null/undefined) never wipe what we already know.
    const known = Object.fromEntries(Object.entries(detail).filter(([, v]) => v !== null && v !== undefined));
    const merged = normalise({ ...e, ...known, ambulance: e.ambulance || known.ambulance ? { ...e.ambulance, ...known.ambulance } : undefined, status_events: detail.status_events || detail.timeline || e.status_events });
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
  // Order: open alerts, then early notices (not confirmed yet), then closed ones.
  const group = (e) => (isFinal(e.state) ? 2 : isEarly(e.state) ? 1 : 0);
  return [...list].sort((a, b) => {
    const closedA = group(a);
    const closedB = group(b);
    if (closedA !== closedB) return closedA - closedB;
    if (closedA === 2) return time(b) - time(a);
    return severity(a) - severity(b) || time(a) - time(b) || String(a.emergency_id).localeCompare(String(b.emergency_id));
  });
}

/** Open alerts nobody has opened yet. */
export const countUnread = (list, ctx = {}) =>
  list.filter((e) => !e._read && !isFinal(e.state) && !isEarly(e.state) && inScope(e, ctx.hospitalId, ctx.scope || 'all')).length;

/**
 * Should this event play the alert sound? Only when an EMERGENCY-level alert becomes a real SOS:
 * created already at SOS_SENT, or an early notice that now reaches SOS_SENT. Never for early notices or cancelled ones.
 */
export function shouldAlertSound(list, msg, ctx = {}) {
  if (!msg?.emergency_id) return false;
  const known = list.find((e) => e.emergency_id === msg.emergency_id);
  const visible = (e) => inScope(e, ctx.hospitalId, ctx.scope || 'all'); // only alerts this desk can see make a sound
  if (msg.event === 'emergency.created') {
    if (known) return false;
    const s = msg.state || 'SOS_SENT';
    return msg.payload?.severity === 'EMERGENCY' && !isEarly(s) && !isFinal(s) && visible({ ...msg.payload, state: s });
  }
  if (!known || known.severity !== 'EMERGENCY') return false;
  // Escalated TO this desk: sound once, like a new alert (not when it leaves or when we already hold it).
  // Checked before the scope test: before the move the alert was at another hospital, so it was not visible here yet.
  const escalatedToMe =
    msg.event === 'hospital.escalated' &&
    ctx.hospitalId != null &&
    String(msg.payload?.to_hospital_id) === String(ctx.hospitalId) &&
    String(known.alerted_hospital_id) !== String(ctx.hospitalId) &&
    canEscalate(known.state);
  if (escalatedToMe) return true;
  if (!visible(known)) return false;
  return msg.state === 'SOS_SENT' && isEarly(known.state);
}

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
