// The city helpers: pick a city, find the nearest one, filter hospitals, and place pins on a small map. No network, no DOM.
import { describe, expect, it } from 'vitest';
import { cityName, filterByCity, isFarFromAll, isInCity, mapPins, nearestCity, pickCity, startPoint } from '../../src/utils/cities';

const CITIES = [
  { city_id: 'AMD', city_name: 'Ahmedabad', state: 'Gujarat', lat: 23.0, lng: 72.5, zoom: 12, simulation_start: { lat: 23.01, lng: 72.51, label: 'Start A' } },
  { city_id: 'PNQ', city_name: 'Pune', state: 'Maharashtra', lat: 18.5, lng: 73.85, zoom: 12, simulation_start: { lat: 18.52, lng: 73.86, label: 'Start P' } },
];
const HOSPITALS = [
  { id: 'HSP-AMD-001', city_id: 'AMD', lat: 23.02, lng: 72.52 }, { id: 'HSP-PNQ-001', city_id: 'PNQ', lat: 18.51, lng: 73.84 },
  { id: 'HSP-PNQ-002', city_id: 'PNQ', lat: 18.55, lng: 73.9 },
];

describe('pickCity', () => {
  it('takes the wanted city when it exists', () => expect(pickCity(CITIES, 'PNQ').city_id).toBe('PNQ'));
  it('falls back to the first city for an unknown or missing id', () => {
    expect(pickCity(CITIES, 'XYZ').city_id).toBe('AMD');
    expect(pickCity(CITIES, undefined).city_id).toBe('AMD');
  });
  it('returns null when there are no cities', () => { expect(pickCity([], 'AMD')).toBeNull(); expect(pickCity(null, 'AMD')).toBeNull(); });
  it('cityName never throws', () => { expect(cityName(CITIES, 'PNQ')).toBe('Pune'); expect(cityName(CITIES, 'XYZ')).toBe(''); expect(cityName(null, 'PNQ')).toBe(''); });
});

describe('nearestCity and isFarFromAll', () => {
  it('finds the city a point is in', () => {
    expect(nearestCity(CITIES, { lat: 18.53, lng: 73.8 }).city_id).toBe('PNQ');
    expect(nearestCity(CITIES, { lat: 23.05, lng: 72.6 }).city_id).toBe('AMD');
  });
  it('returns null when the point is far from every city', () => {
    expect(nearestCity(CITIES, { lat: 28.6, lng: 77.2 })).toBeNull();
    expect(isFarFromAll(CITIES, { lat: 28.6, lng: 77.2 })).toBe(true);
    expect(isFarFromAll(CITIES, { lat: 18.5, lng: 73.85 })).toBe(false);
  });
  it('treats a missing or invalid point as not near anything', () => { expect(nearestCity(CITIES, null)).toBeNull(); expect(nearestCity(CITIES, { lat: 'x', lng: 1 })).toBeNull(); });
});

describe('isInCity', () => {
  it('is true near the city and false in the other city or far away', () => {
    expect(isInCity(CITIES[1], { lat: 18.55, lng: 73.9 })).toBe(true);
    expect(isInCity(CITIES[1], { lat: 23.02, lng: 72.57 })).toBe(false);
    expect(isInCity(null, { lat: 18.5, lng: 73.8 })).toBe(false);
  });
});

describe('filterByCity', () => {
  it('keeps only that city', () => expect(filterByCity(HOSPITALS, 'PNQ').map((h) => h.id)).toEqual(['HSP-PNQ-001', 'HSP-PNQ-002']));
  it('keeps everything when no city is given, and never fails on a missing list', () => { expect(filterByCity(HOSPITALS, null)).toHaveLength(3); expect(filterByCity(undefined, 'AMD')).toEqual([]); });
});

describe('startPoint', () => {
  it('is the simulation start of the city, with an accuracy and no real address', () => {
    expect(startPoint(CITIES[1])).toEqual({ lat: 18.52, lng: 73.86, accuracy: 50 });
  });
  it('is null without a city', () => expect(startPoint(null)).toBeNull());
});

describe('mapPins', () => {
  const box = { width: 400, height: 300 };
  it('puts the city centre in the middle of the box', () => {
    const { centre } = mapPins(CITIES[0], [], null, box);
    expect(centre.x).toBeCloseTo(200, 5); expect(centre.y).toBeCloseTo(150, 5);
  });
  it('puts north above south and east right of west', () => {
    const { pins } = mapPins(CITIES[1], HOSPITALS.filter((h) => h.city_id === 'PNQ'), null, box);
    const a = pins.find((p) => p.id === 'HSP-PNQ-001'); const b = pins.find((p) => p.id === 'HSP-PNQ-002');
    expect(b.y).toBeLessThan(a.y); expect(b.x).toBeGreaterThan(a.x);
  });
  it('keeps every pin and the start point inside the box, zooming out when needed', () => {
    const far = [{ id: 'far', city_id: 'AMD', lat: 23.4, lng: 72.9 }];
    const { pins, start } = mapPins(CITIES[0], far, startPoint(CITIES[0]), box);
    for (const p of [...pins, start]) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(400); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(300); }
  });
  it('uses the zoom of the city: a higher zoom spreads the same points wider', () => {
    const near = [{ id: 'n', city_id: 'AMD', lat: 23.005, lng: 72.505 }];
    const lo = mapPins({ ...CITIES[0], zoom: 11 }, near, null, box).pins[0];
    const hi = mapPins({ ...CITIES[0], zoom: 13 }, near, null, box).pins[0];
    expect(Math.abs(hi.x - 200)).toBeGreaterThan(Math.abs(lo.x - 200));
  });
});
