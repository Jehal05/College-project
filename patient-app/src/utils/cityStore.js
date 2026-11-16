// The city store, free of the network and the browser so it can be tested: dependencies are passed in.
import { pickCity } from './cities';

const KEY = 'ht.city';

export function createCityStore({ loadCities, loadHome, saveHome, storage }) {
  let state = { status: 'idle', cities: null, cityId: null, saveFailed: false };
  let patientId = null; let inflight = null;
  const listeners = new Set();
  const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
  const read = () => { try { return storage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { storage.setItem(KEY, v); } catch { /* storage may be blocked */ } };

  async function init(id) {
    if (state.status === 'ready' && id === patientId) return state;
    if (inflight && id === patientId) return inflight;
    patientId = id;
    set({ status: 'loading' });
    inflight = (async () => {
      try {
        const cities = await loadCities();
        let home = null;
        try { home = await loadHome(id); } catch { /* the home city is optional */ }
        const chosen = pickCity(cities, read() || home);
        set({ status: chosen ? 'ready' : 'error', cities, cityId: chosen ? chosen.city_id : null });
      } catch {
        set({ status: 'error' });
      } finally { inflight = null; }
      return state;
    })();
    return inflight;
  }

  async function select(cityId) {
    const city = (state.cities || []).find((c) => c.city_id === cityId);
    if (!city) return false;
    write(cityId);
    set({ cityId, saveFailed: false });
    try { if (patientId) await saveHome(patientId, cityId); } catch { set({ saveFailed: true }); }
    return true;
  }

  const current = () => (state.cities ? pickCity(state.cities, state.cityId) : null);
  const forget = () => { state = { status: 'idle', cities: null, cityId: null, saveFailed: false }; patientId = null; inflight = null; try { storage.removeItem(KEY); } catch { /* ignore */ } listeners.forEach((l) => l()); };
  return { init, select, current, forget, getState: () => state, subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); } };
}

