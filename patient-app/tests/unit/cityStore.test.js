// The city store: loads once, picks the saved choice or the home city, saves a change, and survives failures.
import { describe, expect, it, vi } from 'vitest';
import { createCityStore } from '../../src/utils/cityStore';

const CITIES = [{ city_id: 'AMD', city_name: 'Ahmedabad', lat: 1, lng: 1, zoom: 12, simulation_start: { lat: 1, lng: 1, label: 'a' } },
  { city_id: 'PNQ', city_name: 'Pune', lat: 2, lng: 2, zoom: 12, simulation_start: { lat: 2, lng: 2, label: 'p' } }];
const memory = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; };
const make = (over = {}) => createCityStore({ loadCities: vi.fn(async () => CITIES), loadHome: vi.fn(async () => 'PNQ'), saveHome: vi.fn(async () => ({})), storage: memory(), ...over });

describe('city store', () => {
  it('starts in the home city of the patient', async () => {
    const s = make(); await s.init('PT-1');
    expect(s.getState().status).toBe('ready'); expect(s.current().city_id).toBe('PNQ');
  });
  it('falls back to the first city when the home city is missing or unknown', async () => {
    for (const home of [undefined, 'XYZ']) { const s = make({ loadHome: async () => home }); await s.init('PT-1'); expect(s.current().city_id).toBe('AMD'); }
  });
  it('still works when the patient cannot be read', async () => {
    const s = make({ loadHome: async () => { throw new Error('offline'); } }); await s.init('PT-1');
    expect(s.getState().status).toBe('ready'); expect(s.current().city_id).toBe('AMD');
  });
  it('fetches the cities once however many screens ask', async () => {
    const loadCities = vi.fn(async () => CITIES); const s = make({ loadCities });
    await Promise.all([s.init('PT-1'), s.init('PT-1')]); await s.init('PT-1');
    expect(loadCities).toHaveBeenCalledTimes(1);
  });
  it('select changes the city, remembers it and saves it as the home city', async () => {
    const saveHome = vi.fn(async () => ({})); const storage = memory(); const s = make({ saveHome, storage, loadHome: async () => 'AMD' }); await s.init('PT-1');
    expect(await s.select('PNQ')).toBe(true);
    expect(s.current().city_id).toBe('PNQ'); expect(saveHome).toHaveBeenCalledWith('PT-1', 'PNQ'); expect(storage.getItem('ht.city')).toBe('PNQ');
  });
  it('the remembered choice wins over the home city on the next start', async () => {
    const storage = memory(); storage.setItem('ht.city', 'AMD'); const s = make({ storage }); await s.init('PT-1');
    expect(s.current().city_id).toBe('AMD');
  });
  it('an unknown city is refused and nothing changes', async () => {
    const saveHome = vi.fn(); const s = make({ saveHome }); await s.init('PT-1');
    expect(await s.select('XYZ')).toBe(false); expect(s.current().city_id).toBe('PNQ'); expect(saveHome).not.toHaveBeenCalled();
  });
  it('a failed save keeps the choice for this session and says so', async () => {
    const s = make({ saveHome: async () => { throw new Error('offline'); } }); await s.init('PT-1'); await s.select('AMD');
    expect(s.current().city_id).toBe('AMD'); expect(s.getState().saveFailed).toBe(true);
  });
  it('is in an error state with no current city when the list cannot be loaded', async () => {
    const s = make({ loadCities: async () => { throw new Error('offline'); } }); await s.init('PT-1');
    expect(s.getState().status).toBe('error'); expect(s.current()).toBeNull();
  });
  it('blocked storage does not break anything', async () => {
    const blocked = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    const s = make({ storage: blocked }); await s.init('PT-1'); await s.select('AMD');
    expect(s.current().city_id).toBe('AMD');
  });
  it('forget clears everything (sign out)', async () => {
    const s = make(); await s.init('PT-1'); s.forget();
    expect(s.getState().status).toBe('idle'); expect(s.current()).toBeNull();
  });
});
