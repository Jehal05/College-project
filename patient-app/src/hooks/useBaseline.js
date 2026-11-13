// Loads the personal baseline ranges used by the digital twin bar.
import { useCallback, useEffect, useState } from 'react';
import { getBaseline } from '../services/api';

export default function useBaseline(patientId) {
  const [baseline, setBaseline] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(() => {
    setStatus('loading');
    getBaseline(patientId).then((b) => { setBaseline(b); setStatus('ready'); }).catch(() => setStatus('error'));
  }, [patientId]);
  useEffect(load, [load]);

  return { baseline, status, reload: load };
}
