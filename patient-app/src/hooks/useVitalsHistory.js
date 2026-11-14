// Keeps the last 60 readings per vital IN MEMORY (never in browser storage) while the person shares live vitals.
// When sharing is off, nothing is kept. "ht:reset" (demo panel) empties it.
import { useEffect, useState } from 'react';
import { readingFromPayload } from '../utils/adapters';
import { emptyHistory, pushReading } from '../utils/trend';

export default function useVitalsHistory(vitals, enabled) {
  const [history, setHistory] = useState(emptyHistory);

  useEffect(() => {
    if (enabled && vitals) setHistory((h) => pushReading(h, readingFromPayload(vitals)));
  }, [vitals, enabled]);
  useEffect(() => { if (!enabled) setHistory(emptyHistory()); }, [enabled]);
  useEffect(() => {
    const clear = () => setHistory(emptyHistory());
    window.addEventListener('ht:reset', clear);
    return () => window.removeEventListener('ht:reset', clear);
  }, []);

  return history;
}
