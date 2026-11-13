// Nearest AED (#23) and community responders (#24). Pure functions.
// All locations in data/aed.json and data/responders.json are SAMPLE data.
import { haversineKm } from './geo.js';

export const WALKING_KMH = 5; // assumed walking speed for the simulated walking time
export const RESPONDER_RADIUS_KM = 3;
const round1 = (x) => Math.round(x * 10) / 10;

const valid = (p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng);

/** Add distance_km (and a simulated walking time) from `from` to each place, nearest first. */
export function withDistanceFrom(places, from) {
  if (!valid(from)) return [];
  return (places || [])
    .filter(valid)
    .map((p) => {
      const distance_km = round1(haversineKm(from, p));
      return { ...p, distance_km, walk_min: Math.max(1, Math.round((distance_km / WALKING_KMH) * 60)) };
    })
    .sort((a, b) => a.distance_km - b.distance_km || String(a.id).localeCompare(String(b.id)));
}

/** The n nearest AEDs to the patient. */
export function nearestAeds(aeds, patient, n = 3) {
  return withDistanceFrom(aeds, patient).slice(0, n);
}

/** Available responders within the radius, nearest first. */
export function respondersNear(responders, patient, radiusKm = RESPONDER_RADIUS_KM) {
  return withDistanceFrom((responders || []).filter((r) => r.available !== false), patient).filter((r) => r.distance_km <= radiusKm);
}
