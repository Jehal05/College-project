// Real GPS rules (no real GPS: the browser's geolocation is a stub). Run by vitest.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/cities', () => ({ currentCityNow: vi.fn(async () => ({ city_id: 'AMD', lat: 23.02, lng: 72.57, zoom: 12, simulation_start: { lat: 23.03, lng: 72.58 }, bounds: null })) }));
vi.mock('../../src/utils/cities', () => ({ isInCity: () => true, startPoint: (c) => (c ? { lat: 23.03, lng: 72.58, accuracy: 0 } : null) }));

import { resolveLocation, stopSharing, resumeSharing, isSharingStopped, locationKind, GPS_TIMEOUT_MS } from '../../src/services/geo';

const store = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal('sessionStorage', { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } });
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: vi.fn((ok) => ok({ coords: { latitude: 23.05, longitude: 72.6, accuracy: 12 } })) } });
});

describe('resolveLocation', () => {
  it('sends nothing when the location consent is off, and never asks the GPS', async () => {
    expect(await resolveLocation(false, 'p1', 'e1')).toBeNull();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });
  it('sends nothing after "Stop sharing", and sends again after resume', async () => {
    stopSharing('e1');
    expect(isSharingStopped('e1')).toBe(true);
    expect(isSharingStopped('e2')).toBe(false);
    expect(await resolveLocation(true, 'p1', 'e1')).toBeNull();
    resumeSharing();
    expect((await resolveLocation(true, 'p1', 'e1')).source).toBe('gps');
  });
  it('asks for a fresh, high-accuracy fix and labels it gps with its accuracy', async () => {
    const loc = await resolveLocation(true, 'p1', 'e1');
    expect(loc).toEqual({ lat: 23.05, lng: 72.6, accuracy: 12, source: 'gps' });
    const opts = navigator.geolocation.getCurrentPosition.mock.calls[0][2];
    expect(opts).toEqual({ enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 });
  });
  it('falls back to the labelled simulated start when the browser refuses', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: vi.fn((_ok, fail) => fail({ code: 1 })) } });
    expect(await resolveLocation(true, 'p1', 'e1')).toMatchObject({ source: 'demo', lat: 23.03 });
  });
  it('locationKind names what is shown to the person', () => {
    expect(locationKind(null)).toBe('off');
    expect(locationKind({ source: 'gps' })).toBe('gps');
    expect(locationKind({ source: 'demo' })).toBe('simulated');
  });
});
