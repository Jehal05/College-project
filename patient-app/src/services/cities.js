// The one place that knows which city the person is in. Fetches /cities once and remembers it (the API layer keeps a saved
// copy, so the last answer still works offline). The chosen city is the patient's home_city_id; a choice made here is
// saved there. No screen has coordinates of its own: map centre, zoom and the simulated start point all come from this list.
import { getCities, getPatient, updatePatient } from './api';
import { startPoint } from '../utils/cities';
import { createCityStore } from '../utils/cityStore';

const safeStorage = () => { try { return window.sessionStorage; } catch { return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; } };

export const cityStore = createCityStore({
  loadCities: getCities,
  loadHome: async (id) => (await getPatient(id)).home_city_id,
  saveHome: (id, cityId) => updatePatient(id, { home_city_id: cityId }),
  storage: safeStorage(),
});

/** Waits for the list of cities (once) and returns the current city, or null when there is none (never loaded, never saved). */
export async function currentCityNow(patientId) {
  const s = await cityStore.init(patientId);
  return s.status === 'ready' ? cityStore.current() : null;
}
export const currentStart = () => startPoint(cityStore.current());
