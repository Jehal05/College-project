// Keeps the last 20 monitoring events IN MEMORY only (gone when the page is closed).
import { useEffect, useRef, useState } from 'react';
import { detectEvents } from '../utils/monitorEvents';

export default function useMonitorEvents(rows, connected) {
  const [events, setEvents] = useState([]);
  const prev = useRef({});
  const counter = useRef(0);
  const signature = rows.map((r) => r.key + ':' + r.within).join('|');
  useEffect(() => {
    const { events: added, next } = detectEvents(prev.current, rows, connected, new Date());
    prev.current = next;
    if (added.length) setEvents((list) => [...added.map((e) => ({ ...e, id: ++counter.current })).reverse(), ...list].slice(0, 20));
  }, [signature, connected]); // eslint-disable-line react-hooks/exhaustive-deps -- `rows` is covered by the signature
  return events;
}
