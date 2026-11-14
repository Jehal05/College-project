// Shared case history (features #48, #31 and #30). Past cases from the history store plus the
// live emergency list, merged, so the history page, the report and the analytics page all
// use the same data.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadHistory, saveFinished } from '../services/historyStore.js';
import { mergeCases } from '../services/cases.js';
import { useAuth } from './AuthProvider.jsx';
import { useEmergencies } from './EmergencyProvider.jsx';

const HistoryContext = createContext(null);

export function HistoryProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const { emergencies } = useEmergencies();
  const [stored, setStored] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setStored(await loadHistory());
      setError('');
    } catch (err) {
      setError(`Could not load the case history (${err.message}).`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) reload();
    else setStored([]);
  }, [isLoggedIn, reload]);

  // Keep finished cases (mock mode) so they survive a reload.
  useEffect(() => {
    if (isLoggedIn) saveFinished(emergencies);
  }, [emergencies, isLoggedIn]);

  const cases = useMemo(() => mergeCases(stored, emergencies), [stored, emergencies]);
  const value = useMemo(() => ({ cases, loading, error, reload }), [cases, loading, error, reload]);
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used inside <HistoryProvider>');
  return ctx;
}
