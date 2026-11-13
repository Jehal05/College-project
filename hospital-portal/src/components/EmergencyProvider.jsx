// Shared emergency store (Phase 2).
// One place holds every active emergency and its timeline. It loads the first list
// from the API, then applies every WebSocket event, so the alert queue, the detail
// panel and the timeline always agree.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as api from '../services/api.js';
import { subscribe, onStatus, getStatus } from '../services/socket.js';
import { emergencyReducer, sortForQueue } from '../services/emergencyReducer.js';
import { canTransition, whyNot } from '../services/stateMachine.js';
import { playAlertSound } from '../services/sound.js';
import { useAuth } from './AuthProvider.jsx';

const EmergencyContext = createContext(null);

export function EmergencyProvider({ children }) {
  const { session, isLoggedIn } = useAuth();
  const [list, send] = useReducer(emergencyReducer, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(list);
  listRef.current = list;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      send({ type: 'load', list: await api.getAlerts() });
      setError('');
    } catch (err) {
      setError(`Could not load the alert list (${err.message}). New alerts will still appear live.`);
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
      if (msg.event === 'emergency.created' && !listRef.current.some((e) => e.emergency_id === msg.emergency_id)) {
        playAlertSound();
      }
      send({ type: 'event', msg });
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
    async (id, target) => {
      const current = listRef.current.find((e) => e.emergency_id === id);
      if (!current) throw new Error('This emergency is no longer in the list.');
      if (!canTransition(current.state, target)) throw new Error(whyNot(current.state, target));

      let res;
      if (target === 'HOSPITAL_ACKNOWLEDGED') res = await api.acknowledge(id);
      else if (target === 'AMBULANCE_DISPATCHED') res = await api.dispatch(id, 'AMB-1'); // fleet choice comes in Phase 4
      else res = await api.updateStatus(id, target);

      // Apply the result straight away. The WebSocket echo of the same change is ignored as a duplicate.
      send({
        type: 'event',
        msg: {
          event: 'local',
          emergency_id: id,
          state: res?.state || target,
          timestamp: res?.timestamp || new Date().toISOString(),
          payload: { actor: res?.actor || session?.name || 'Hospital staff' },
        },
      });
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

  const value = useMemo(
    () => ({ emergencies: sortForQueue(list), loading, error, act, refresh, reload }),
    [list, loading, error, act, refresh, reload],
  );

  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>;
}

export function useEmergencies() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergencies must be used inside <EmergencyProvider>');
  return ctx;
}
