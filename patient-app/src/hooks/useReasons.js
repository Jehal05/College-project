// Loads "why this alert" for one emergency, only when asked (the card is collapsed until the person opens it).
import { useCallback, useState } from 'react';
import { getReasons } from '../services/api';

export default function useReasons(emergencyId) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const load = useCallback(() => {
    setStatus('loading');
    getReasons(emergencyId).then((d) => { setData(d); setStatus('ready'); }).catch(() => setStatus('error'));
  }, [emergencyId]);
  return { data, status, load };
}
