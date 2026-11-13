// Shared emergency store (Phase 2).
// One place holds every active emergency and its timeline. It loads the first list
// from the API, then applies every WebSocket event, so the alert queue, the detail
// panel and the timeline always agree.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as api from '../services/api.js';
import { subscribe, onStatus, getStatus } from '../services/socket.js';
import { emergencyReducer, sortForQueue, countUnread, shouldAlertSound } from '../services/emergencyReducer.js';
import { canTransition, whyNot } from '../services/stateMachine.js';
import { playAlertSound } from '../services/sound.js';
import { useAuth } from './AuthProvider.jsx';
import { USE_MOCK } from '../services/config.js';
import { getScope, getSelectedId, subscribeUi } from '../services/uiStore.js';
import { announcementFor } from '../services/announce.js';
import { scopeList } from '../services/queueScope.js';

const EmergencyContext = createContext(null);

export function EmergencyProvider({ children }) {
  const { session, isLoggedIn } = useAuth();
  const [list, send] = useReducer(emergencyReducer, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(list);
  listRef.current = list;
  const refreshRef = useRef(null);
  const [announcement, setAnnouncement] = useState(null); // { id, text, politeness } for the hidden live region
  const [scope, setScopeState] = useState(getScope());
  useEffect(() => subscribeUi(() => setScopeState(getScope())), []);
  const hospitalId = session?.hospital_id;
  const ctxRef = useRef({});
  ctxRef.current = { hospitalId, scope };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      send({ type: 'load', list: await api.getAlerts() });
      setError('');
    } catch (err) {
      setError(`Could not load the alert list: ${err.message} New alerts will still appear live.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on login, clear on logout.
  useEffect(() => {
    if (!isLoggedIn) return send({ type: 'clear' });
    reload();
  }, [isLoggedIn, reload]);

  // Apply every live event.
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    return subscribe('*', (msg) => {
      // Sound only for new EMERGENCY-level alerts (feature #59), so it keeps its meaning.
      const ctx = ctxRef.current;
      if (shouldAlertSound(listRef.current, msg, ctx)) playAlertSound();
      const said = announcementFor(listRef.current, msg, { ...ctx, selectedId: getSelectedId() });
      if (said) setAnnouncement({ ...said, id: `${Date.now()}-${Math.random()}` });
      send({ type: 'event', msg });
      // A real backend's created event may lack patient, location and hospital: fetch the full record once.
      if (!USE_MOCK && msg.event === 'emergency.created' && msg.emergency_id) setTimeout(() => refreshRef.current?.(msg.emergency_id), 400);
    });
  }, [isLoggedIn]);

  // After a dropped connection comes back, reload so no event is missed.
  useEffect(() => {
    let previous = getStatus();
    return onStatus((status) => {
      if (status === 'live' && previous === 'reconnecting' && isLoggedIn) reload();
      previous = status;
    });
  }, [isLoggedIn, reload]);

  /** Staff action. Throws an Error with a readable message if it is not allowed or fails. */
  const act = useCallback(
    async (id, target, options = {}) => {
      const current = listRef.current.find((e) => e.emergency_id === id);
      if (!current) throw new Error('This emergency is no longer in the list.');
      if (!canTransition(current.state, target)) throw new Error(whyNot(current.state, target));

      let res;
      let localOnly = false;
      try {
        if (target === 'HOSPITAL_ACKNOWLEDGED') res = await api.acknowledge(id);
        else if (target === 'AMBULANCE_DISPATCHED') {
          if (!options.ambulanceId) throw new Error('Choose an ambulance to dispatch.');
          res = await api.dispatch(id, options.ambulanceId);
        } else res = await api.updateStatus(id, target);
      } catch (err) {
        if (!api.isMissingEndpoint(err)) throw err;
        localOnly = true; // the backend cannot take this step yet: apply it on this screen only and say so
      }

      // Apply the result straight away. The WebSocket echo of the same change is ignored as a duplicate.
      send({
        type: 'event',
        msg: {
          event: 'local',
          emergency_id: id,
          state: res?.state || target,
          timestamp: res?.timestamp || new Date().toISOString(),
          payload: {
            actor: res?.actor || session?.name || 'Hospital staff',
            ...(options.ambulanceId ? { ambulance_id: res?.ambulance_id || options.ambulanceId } : {}),
          },
        },
      });
      return { local_only: localOnly };
    },
    [session?.name],
  );

  /** Fetch full details and timeline for one emergency (used with the real backend). */
  const refresh = useCallback(async (id) => {
    try {
      const detail = await api.getEmergency(id);
      if (detail) send({ type: 'merge', detail: { ...detail, emergency_id: detail.emergency_id || id } });
    } catch (err) {
      console.warn(`Could not refresh emergency ${id}`, err);
    }
  }, []);

  refreshRef.current = refresh;

  /** Add a timeline note with no state change (pickup, corridor request, team assignment). */
  const addNote = useCallback(async (id, kind, note, fields = {}) => {
    let res = null;
    let localOnly = false;
    try {
      res = await api.addNote(id, { kind, note, fields });
    } catch (err) {
      if (!api.isMissingEndpoint(err)) throw err; // no notes endpoint yet: the note stays on this screen
      localOnly = true;
    }
    const timestamp = res?.timestamp || new Date().toISOString();
    send({
      type: 'event',
      msg: {
        event: 'emergency.note',
        emergency_id: id,
        timestamp,
        payload: { note_id: res?.note_id || `${timestamp}|${note}`, kind, note, fields: res?.fields || fields, actor: res?.actor || session?.name || 'Hospital staff', ...(localOnly ? { local_only: true } : {}) },
      },
    });
    return { localOnly };
  }, [session?.name]);

  /** Mark an alert as opened (clears its unread dot). */
  const markRead = useCallback((id) => send({ type: 'read', id }), []);

  /** Tick or untick a pre-arrival checklist item. Throws if the save fails. */
  const tick = useCallback(async (id, itemId, done) => {
    let res = null;
    try {
      res = await api.setChecklistItem(id, itemId, done);
    } catch (err) {
      if (!api.isMissingEndpoint(err)) throw err; // no checklist endpoint yet: the tick stays on this screen
    }
    const current = listRef.current.find((e) => e.emergency_id === id);
    const fallback = { ...current?.checklist, [itemId]: { done, by: session?.name || 'Hospital staff', at: new Date().toISOString() } };
    send({ type: 'checklist', id, checklist: res?.checklist || fallback });
  }, [session?.name]);

  const value = useMemo(
    () => ({
      emergencies: sortForQueue(list),
      visibleEmergencies: sortForQueue(scopeList(list, hospitalId, scope)),
      unreadCount: countUnread(list, { hospitalId, scope }),
      announcement,
      loading, error, act, refresh, reload, markRead, tick, addNote,
    }),
    [list, hospitalId, scope, announcement, loading, error, act, refresh, reload, markRead, tick, addNote],
  );

  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>;
}

export function useEmergencies() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergencies must be used inside <EmergencyProvider>');
  return ctx;
}
