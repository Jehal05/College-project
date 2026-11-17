// Geography helpers. Travel time is SIMULATED (straight-line distance ÷ assumed speed);
// always show it with the "Simulated ETA" label.

import cities from '../data/cities.json' with { type: 'json' };

// Fixed demo location (patient position used when GPS is off): the first city's simulated start, from data/cities.json.
const FIRST = cities[0] || { lat: 0, lng: 0 };
const START = FIRST.simulation_start || FIRST;
export const DEMO_LOCATION = { lat: START.lat, lng: START.lng, label: 'Demo patient location' };

// Assumed average ambulance speed in city traffic.
export const ASSUMED_SPEED_KMH = 40;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres between two {lat, lng} points. */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Simulated travel time in whole minutes (minimum 1). */
export function simulatedTravelMinutes(distanceKm, speedKmh = ASSUMED_SPEED_KMH) {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

/** Adds distance_km and eta_min to each hospital, relative to `from`. */
export function withDistance(hospitals, from) {
  return hospitals.map((h) => {
    const distance_km = Math.round(haversineKm(from, h) * 10) / 10;
    return { ...h, distance_km, eta_min: simulatedTravelMinutes(distance_km) };
  });
}
