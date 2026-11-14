// Pure functions that keep the list of emergencies up to date.
// No React in here, so it is easy to test (see emergencyReducer.test.js).
import { isFinal, isEarly } from './stateMachine.js';
import { withMotion } from './adapters.js';
import { inScope } from './queueScope.js';

// Local receive time of an event (ms). The socket adds received_at; without it we fall back to the event's own timestamp.
const receivedMs = (msg) => (Number.isFinite(msg?.received_at) ? msg.received_at : new Date(msg?.timestamp || Date.now()).getTime());
import { canEscalate } from './escalation.js';

// More than this many seconds apart = a different alert that happens to reuse the id (clocks and event delays stay well below it).
export const SAME_ALERT_SECONDS = 5;

/**
 * Is `incomingAt` (ISO time of an emergency.created) clearly a different alert from the one we hold?
 * The case counts as the same when the time is close to ANY start time we know of it: when it was created, when the SOS was
 * confirmed, or when its first steps were logged. (The list and the live event can name slightly different moments.)
 * Missing or bad times never count as "different".
 */
export function isNewCaseWithOldId(existing, incomingAt) {
  const b = new Date(incomingAt).getTime();
  if (!Number.isFinite(b)) return false;
  const startSteps = (existing?.status_events || []).filter((s) => s.state === 'SOS_SENT' || isEarly(s.state)).map((s) => s.timestamp);
  const known = [existing?.created_at, existing?.sos_sent_at, ...startSteps].map((t) => new Date(t).getTime()).filter(Number.isFinite);
  if (known.length === 0) return false;
  return known.every((a) => Math.abs(a - b) > SAME_ALERT_SECONDS * 1000);
}

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
    if (idx >= 0) {
      // Same id again. Normally a repeat of the same alert: ignore it. But if the backend was reset it counts ids from the start,
      // so a different alert time means a NEW case with an old id: replace the old card.
      if (!isNewCaseWithOldId(list[idx], payload.created_at || timestamp)) return list;
      list = list.filter((_, i) => i !== idx);
    }
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
    if (!hospitalId) return list;
    if (hospitalId === current.alerted_hospital_id) {
      // Same hospital: only fill in a name we did not have yet.
      return payload.hospital_name && !current.alerted_hospital_name ? replace({ ...current, alerted_hospital_name: payload.hospital_name }) : list;
    }
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
      // The old name belonged to the hospital it left: use the new one, or none (the label then looks it up by id).
      ...(payload.to_hospital_id ? { alerted_hospital_name: payload.to_hospital_name || null } : {}),
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
        { state: 'NOTE', kind: payload.kind || null, note: payload.note, note_id: noteId, timestamp: timestamp || new Date().toISOString(), actor: payload.actor || null, ...(payload.local_only ? { local_only: true } : {}) },
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
    // The detail is the newer word on severity: if it sends one, the earlier "missing" mark goes away.
    const merged = normalise({ ...e, ...known, severity_missing: known.severity_missing || undefined, ambulance: e.ambulance || known.ambulance ? { ...e.ambulance, ...known.ambulance } : undefined, status_events: detail.status_events || detail.timeline || e.status_events });
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

// ---------- Reload without losing what arrived meanwhile ----------

const ms = (t) => new Date(t).getTime();
const lastEventMs = (e) => (e.status_events || []).reduce((m, ev) => (Number.isFinite(ms(ev.timestamp)) ? Math.max(m, ms(ev.timestamp)) : m), 0);
const SAME_EVENT_MS = 5000; // the same step reported by the list and by the live feed can differ by a few seconds

/** Are these two timeline entries the same thing? Notes match by id; steps match by state and time. */
function sameEvent(a, b) {
  if (a.state === 'NOTE' || b.state === 'NOTE') {
    if (a.state !== b.state) return false;
    return a.note_id && b.note_id ? a.note_id === b.note_id : a.note === b.note && Math.abs(ms(a.timestamp) - ms(b.timestamp)) <= SAME_EVENT_MS;
  }
  return a.state === b.state && Math.abs(ms(a.timestamp) - ms(b.timestamp)) <= SAME_EVENT_MS;
}

/** Timeline of the server list plus the entries only this screen has (live events, local notes), oldest first. */
export function mergeTimelines(serverEvents = [], localEvents = []) {
  const merged = [...serverEvents];
  for (const ev of localEvents) if (!merged.some((m) => sameEvent(m, ev))) merged.push(ev);
  return merged
    .map((ev, i) => ({ ev, i }))
    .sort((x, y) => (ms(x.ev.timestamp) || 0) - (ms(y.ev.timestamp) || 0) || x.i - y.i)
    .map((x) => x.ev);
}

/** Checklist: per item, the newer tick wins. */
function mergeChecklists(server = {}, local = {}) {
  const out = { ...server };
  for (const [id, item] of Object.entries(local)) {
    const other = out[id];
    if (!other || (ms(item?.at) || 0) > (ms(other?.at) || 0)) out[id] = item;
  }
  return out;
}

/**
 * Combine a freshly loaded list with what this screen already holds.
 * A load that was in flight while live events arrived must not undo them:
 *   - the same case: timeline entries, notes and checklist ticks of both are kept; if this screen has a NEWER step, its state wins
 *   - a case that only this screen has: kept when it was updated since the load began (it arrived live), else dropped (finished meanwhile)
 *   - the same id but a clearly different alert time = a new case with a reused id: the loaded one replaces the old one
 *   - read marks, NEW marks and flash times are kept
 */
export function mergeLoaded(list, loaded, startedAt = 0) {
  const known = new Map(list.map((e) => [e.emergency_id, e]));
  const out = (loaded || []).map((raw) => {
    const fresh = normalise(raw);
    const local = known.get(fresh.emergency_id);
    known.delete(fresh.emergency_id);
    if (!local || isNewCaseWithOldId(local, fresh.created_at)) return { ...fresh, _read: Boolean(local?._read && !isNewCaseWithOldId(local, fresh.created_at)) };
    const localNewer = lastEventMs(local) > lastEventMs(fresh);
    const base = localNewer ? { ...fresh, ...pickLive(local) } : fresh;
    return {
      ...base,
      status_events: mergeTimelines(fresh.status_events, local.status_events),
      checklist: mergeChecklists(fresh.checklist, local.checklist),
      alerted_ids: [...new Set([...(fresh.alerted_ids || []), ...(local.alerted_ids || [])])],
      _read: Boolean(local._read),
      _new: local._new ?? fresh._new,
      ...(local.taken_over_by ? { taken_over_by: local.taken_over_by, taken_over_from: local.taken_over_from } : {}),
      ...(local.flash_from != null ? { flash_from: local.flash_from } : {}),
      ...(local.sos_sent_at && !fresh.sos_sent_at ? { sos_sent_at: local.sos_sent_at } : {}),
    };
  });
  // Cases only this screen has: keep the ones that arrived live while the load was running.
  for (const local of known.values()) {
    const touched = Math.max(lastEventMs(local), Number.isFinite(local.flash_from) ? local.flash_from : 0);
    if (startedAt && touched >= startedAt - 1000) out.push(local);
  }
  return out;
}

// The fields a live event changes. Used when this screen is ahead of the loaded list.
const pickLive = (e) => ({
  state: e.state,
  escalation_level: e.escalation_level,
  alerted_hospital_id: e.alerted_hospital_id,
  alerted_hospital_name: e.alerted_hospital_name,
  escalated_to_name: e.escalated_to_name,
  escalated_at: e.escalated_at,
  ambulance_id: e.ambulance_id,
  ambulance: e.ambulance,
});

export function emergencyReducer(list, action) {
  switch (action.type) {
    case 'load':
      // Keeps read marks, notes, ticks and live events that arrived while the list was loading (see mergeLoaded).
      return mergeLoaded(list, action.list, action.startedAt);
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
