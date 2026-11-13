// Loads one emergency and keeps it up to date from live WebSocket events.
// If the connection drops, it fetches again when the connection comes back.
import { useCallback, useEffect, useState } from 'react';
import { getEmergency } from '../services/api';
import { connectEvents } from '../services/socket';

// Merge one live event into the emergency we already have.
function applyEvent(current, event) {
  if (!current) return current;
  const next = { ...current, state: event.state };
  const last = current.status_events[current.status_events.length - 1];
  next.status_events = last && last.state === event.state
    ? current.status_events
    : [...current.status_events, { state: event.state, timestamp: event.timestamp }];
  const p = event.payload || {};
  if (p.hospital) next.hospital = p.hospital;
  if (p.ambulance_id) next.ambulance = { id: p.ambulance_id };
  if (typeof p.eta_seconds === 'number') next.eta_seconds = p.eta_seconds;
  return next;
}

export default function useEmergency(id) {
  const [emergency, setEmergency] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(true);

  const reload = useCallback(() => {
    setError(null);
    return getEmergency(id).then(setEmergency).catch(setError);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    let wasDown = false;
    return connectEvents(
      (event) => {
        if (event.emergency_id === id) setEmergency((cur) => applyEvent(cur, event));
      },
      (up) => {
        setConnected(up);
        if (!up) wasDown = true;
        else if (wasDown) { wasDown = false; reload(); } // missed events: get the full state again
      }
    );
  }, [id, reload]);

  return { emergency, events: emergency ? emergency.status_events : [], connected, error, reload };
}
