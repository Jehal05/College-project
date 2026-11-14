// Loads the consent switches and saves each change straight away.
// If saving fails, the switch goes back to where it was (rollback) and a Retry is offered.
import { useCallback, useEffect, useState } from 'react';
import { getConsents, saveConsents } from '../services/api';

export default function useConsents(patientId) {
  const [consents, setConsents] = useState(null);
  const [changes, setChanges] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | failed
  const [failedKey, setFailedKey] = useState(null);

  const load = useCallback(() => {
    setStatus('loading');
    getConsents(patientId)
      .then((r) => { setConsents(r.consents); setChanges(r.changes); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [patientId]);
  useEffect(load, [load]);

  const toggle = useCallback((key) => {
    const before = consents;
    setConsents({ ...before, [key]: !before[key] });
    setSaveState('saving');
    saveConsents(patientId, { ...before, [key]: !before[key] })
      .then((r) => { setConsents(r.consents); setChanges(r.changes); setSaveState('saved'); })
      .catch(() => { setConsents(before); setFailedKey(key); setSaveState('failed'); });
  }, [consents, patientId]);

  const retry = () => failedKey && toggle(failedKey);
  return { consents, changes, status, saveState, load, toggle, retry };
}
