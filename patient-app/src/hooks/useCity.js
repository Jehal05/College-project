// { cities, city, status, select, saveFailed } for the person's current city. Loads the cities on first use.
import { useEffect, useSyncExternalStore } from 'react';
import useAuth from './useAuth';
import { cityStore } from '../services/cities';

export default function useCity() {
  const { session } = useAuth();
  const patientId = session && session.patient_id;
  const state = useSyncExternalStore(cityStore.subscribe, cityStore.getState);
  useEffect(() => { if (patientId) cityStore.init(patientId); }, [patientId]);
  return { cities: state.cities || [], city: cityStore.current(), status: state.status, saveFailed: state.saveFailed, select: cityStore.select };
}
