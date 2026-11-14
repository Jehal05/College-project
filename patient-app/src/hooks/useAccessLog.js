// Loads "who saw my data" and adds new entries at the top as they happen (live event data.accessed).
import { useCallback, useEffect, useState } from 'react';
import { getAccessLog } from '../services/api';
import { connectEvents } from '../services/socket';
import { mergeEntries } from '../utils/accessLog';

export default function useAccessLog(patientId) {
  const [entries, setEntries] = useState([]);
  const [more, setMore] = useState(false);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [justNow, setJustNow] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    getAccessLog(patientId)
      .then((r) => { setEntries(r.entries); setMore(r.more); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [patientId]);
  useEffect(load, [load]);

  useEffect(() => connectEvents((ev) => {
    const entry = ev && ev.type === 'data.accessed' && ev.payload && ev.payload.entry;
    if (!entry) return;
    setEntries((cur) => mergeEntries(cur, [entry]));
    setJustNow(true);
  }, () => {}), []);

  const loadMore = useCallback(() => {
    const last = entries[entries.length - 1];
    if (!last) return;
    getAccessLog(patientId, { before: last.id })
      .then((r) => { setEntries((cur) => [...cur, ...r.entries.filter((x) => !cur.some((c) => c.id === x.id))]); setMore(r.more); })
      .catch(() => setStatus('error'));
  }, [entries, patientId]);

  return { entries, more, status, justNow, load, loadMore };
}
