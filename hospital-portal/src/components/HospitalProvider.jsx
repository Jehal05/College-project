// Shared hospital store (Phase 3). The map, the ranking table and the availability
// form all read the same list, so a change in one place shows everywhere at once.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../services/api.js';
import { useAuth } from './AuthProvider.jsx';

const HospitalContext = createContext(null);

export function HospitalProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setHospitals(await api.getHospitals()); // no type filter: ruled-out hospitals are shown with a reason
      setError('');
    } catch (err) {
      setError(`Could not load hospitals (${err.message}).`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) reload();
    else setHospitals([]);
  }, [isLoggedIn, reload]);

  /** Save beds / ICU / unit readiness for one hospital. Throws if the save fails. */
  const saveAvailability = useCallback(async (id, availability) => {
    const res = await api.updateAvailability(id, availability);
    const saved = res?.availability || availability;
    setHospitals((list) => list.map((h) => (h.id === id ? { ...h, availability: { ...h.availability, ...saved } } : h)));
  }, []);

  const value = useMemo(() => ({ hospitals, loading, error, reload, saveAvailability }), [hospitals, loading, error, reload, saveAvailability]);
  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospitals() {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error('useHospitals must be used inside <HospitalProvider>');
  return ctx;
}
