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

  /** Admin: add a hospital. It starts unverified. Throws if the save fails. */
  const addHospital = useCallback(async (data) => {
    const saved = await api.createHospital(data);
    setHospitals((list) => [...list, { verified: false, ...data, ...saved }]);
    return saved;
  }, []);

  /** Admin: change a hospital's details. Throws if the save fails. */
  const editHospital = useCallback(async (id, data) => {
    const saved = await api.updateHospital(id, data);
    setHospitals((list) => list.map((h) => (h.id === id ? { ...h, ...data, ...(saved && typeof saved === 'object' ? saved : {}), id, verified: h.verified } : h)));
  }, []);

  /** Admin: verify or unverify. The ranking changes at once. Throws if the save fails. */
  const setVerified = useCallback(async (id, verified) => {
    await api.setHospitalVerified(id, verified);
    setHospitals((list) => list.map((h) => (h.id === id ? { ...h, verified } : h)));
  }, []);

  const value = useMemo(
    () => ({ hospitals, loading, error, reload, saveAvailability, addHospital, editHospital, setVerified }),
    [hospitals, loading, error, reload, saveAvailability, addHospital, editHospital, setVerified],
  );
  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospitals() {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error('useHospitals must be used inside <HospitalProvider>');
  return ctx;
}
