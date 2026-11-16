// The city the desk is looking at. Staff see the city of their own hospital; an admin can switch city or choose "All cities".
// The list of cities comes from GET /cities (or src/data/cities.json in mock mode). The choice is remembered (storage may be blocked).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import citiesSeed from '../data/cities.json';
import * as api from '../services/api.js';
import { useAuth } from './AuthProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';
import { ALL_CITIES, defaultCityId, showingLabel, startPointOf } from '../services/cityScope.js';

const KEY = 'ht_portal_city';
const CityContext = createContext(null);

const readChoice = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const writeChoice = (v) => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked */ } };

export function CityProvider({ children }) {
  const { isLoggedIn, session, role } = useAuth();
  const { hospitals } = useHospitals();
  const [cities, setCities] = useState(citiesSeed);
  const [choice, setChoice] = useState(readChoice);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let on = true;
    api.getCities().then((list) => { if (on && Array.isArray(list) && list.length) setCities(list); }).catch(() => {});
    return () => { on = false; };
  }, [isLoggedIn]);

  const canSwitch = role === 'admin';
  const own = defaultCityId(session, hospitals, cities);
  const valid = (id) => id === ALL_CITIES || cities.some((c) => c.city_id === id);
  // Staff always see their own city. An admin's remembered choice wins when it is still a real city.
  const cityId = canSwitch && choice && valid(choice) ? choice : own;

  const setCityId = useCallback((id) => { writeChoice(id); setChoice(id); }, []);
  const value = useMemo(() => ({
    cities, cityId, setCityId, canSwitch, isAll: cityId === ALL_CITIES,
    city: cities.find((c) => c.city_id === cityId) || null,
    showing: showingLabel(cities, cityId), start: startPointOf(cities, cityId),
  }), [cities, cityId, setCityId, canSwitch]);
  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error('useCity must be used inside <CityProvider>');
  return ctx;
}
