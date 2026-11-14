// Loads the record of one finished (or running) alert.
import { useCallback, useEffect, useState } from 'react';
import { getSummary } from '../services/api';

export default function useSummary(patientId, emergencyId) {
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notFound | error
  const load = useCallback(() => {
    setStatus('loading');
    getSummary(patientId, emergencyId)
      .then((s) => { setSummary(s); setStatus('ready'); })
      .catch((err) => setStatus(err.status === 404 ? 'notFound' : 'error'));
  }, [patientId, emergencyId]);
  useEffect(load, [load]);
  return { summary, status, load };
}
