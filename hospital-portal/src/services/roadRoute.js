// Real road routes and travel times from the public OSRM demo server (address: config/external.js).
// ONLY coordinates are sent (the address contains four numbers and nothing else): never a name, an id or health data.
// If the server is slow (4 s), offline, blocked or answers something unexpected, this returns null and the caller keeps the simulated
// straight-ish route and the assumed-speed estimate. Pure of React; fetch is passed in so tests never touch the internet.
import { ROUTING_URL, ROUTING_TIMEOUT_MS, ROAD_ROUTES } from '../config/external.js';
import { cumulativeKm } from '../sim/ambulance-route.js';

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const okPoint = (p) => p && num(p.lat) && num(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
const r6 = (v) => Math.round(v * 1e6) / 1e6;

/** OSRM wants longitude first. */
export function osrmUrl(base, a, b) {
  return `${String(base).replace(/\/+$/, '')}/route/v1/driving/${r6(a.lng)},${r6(a.lat)};${r6(b.lng)},${r6(b.lat)}?overview=full&geometries=geojson`;
}

/** { points: [{lat,lng}...], distance_km, duration_s } from an OSRM answer, or null if it is not a usable route. */
export function parseOsrm(json) {
  const r = json && json.code === 'Ok' && Array.isArray(json.routes) ? json.routes[0] : null;
  const coords = r && r.geometry && r.geometry.coordinates;
  if (!r || !Array.isArray(coords) || coords.length < 2 || !num(r.distance) || !num(r.duration)) return null;
  const points = coords.map((c) => ({ lat: c[1], lng: c[0] }));
  if (!points.every(okPoint)) return null;
  return { points, distance_km: Math.round(r.distance / 100) / 10, duration_s: Math.round(r.duration) };
}

/** One leg by road, or null on any problem (timeout, offline, bad status, odd answer). */
export async function fetchRoadLeg(a, b, { fetchImpl = globalThis.fetch, timeoutMs = ROUTING_TIMEOUT_MS, baseUrl = ROUTING_URL } = {}) {
  if (!okPoint(a) || !okPoint(b) || typeof fetchImpl !== 'function') return null;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => ctl && ctl.abort(), timeoutMs);
  try {
    const res = await Promise.race([
      fetchImpl(osrmUrl(baseUrl, a, b), { signal: ctl ? ctl.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs + 50)),
    ]);
    if (!res || !res.ok) return null;
    return parseOsrm(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The same shape as routeForEmergency() returns, but with road geometry: ambulance base -> patient -> hospital.
 * Both legs must succeed, otherwise null (never a half road, half simulated path).
 * Adds source: 'road', road_km and road_seconds (OSRM's own estimate, before traffic).
 */
export async function roadVersion(route, opts) {
  if (!route) return null;
  const start = route.ambulance.base || route.ambulance;
  const [first, second] = await Promise.all([fetchRoadLeg(start, route.patient, opts), fetchRoadLeg(route.patient, route.hospital, opts)]);
  if (!first || !second) return null;
  const points = [...first.points, ...second.points.slice(1)];
  const cumulative = cumulativeKm(points);
  return {
    ...route, points, pickupIndex: first.points.length - 1, cumulative, totalKm: cumulative[cumulative.length - 1],
    source: 'road', road_km: Math.round((first.distance_km + second.distance_km) * 10) / 10, road_seconds: first.duration_s + second.duration_s,
  };
}

// One request per trip, shared by the tracking map and the trip runner. A failed answer is kept too, so a dead server is asked once.
const answers = new Map();
export const routeKey = (r) => [r.ambulance.id, r.patient.lat, r.patient.lng, r.hospital.id].join('|');
export const cachedRoad = (route) => (route && answers.has(routeKey(route)) ? answers.get(routeKey(route)).value : undefined);
export function loadRoad(route, opts) {
  if (!ROAD_ROUTES || !route) return Promise.resolve(null);
  const k = routeKey(route);
  if (!answers.has(k)) {
    const entry = { value: undefined, promise: roadVersion(route, opts).then((v) => { entry.value = v; return v; }) };
    answers.set(k, entry);
  }
  return answers.get(k).promise;
}
export const clearRoadCache = () => answers.clear();
