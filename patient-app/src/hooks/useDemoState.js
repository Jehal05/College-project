// The mock server's demo state (speed, vitals profile, pinned values). Demo panel only.
import { useCallback, useEffect, useState } from 'react';
import { getDemoState } from '../services/api';

export default function useDemoState() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => getDemoState().then((s) => { setState(s); setError(false); }).catch(() => setError(true)), []);
  useEffect(() => { refresh(); }, [refresh]);
  return { state, error, refresh };
}
