// City helpers for the patient app. Pure functions: no network, no DOM. The list of cities comes from GET /cities
// (the backend's cities.json is the truth), so no screen carries coordinates of its own.

const R = 6371;
function km(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat); const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export const FAR_KM = 80; // farther than this from every city centre: not "in" a city

export const pickCity = (cities, wantedId) => {
  if (!Array.isArray(cities) || !cities.length) return null;
  return cities.find((c) => c.city_id === wantedId) || cities[0];
};
export const cityName = (cities, id) => {
  const c = Array.isArray(cities) ? cities.find((x) => x.city_id === id) : null;
  return c ? c.city_name : '';
};

const isPoint = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

export function nearestCity(cities, point) {
  if (!isPoint(point) || !Array.isArray(cities) || !cities.length) return null;
  const best = cities.map((c) => ({ c, d: km(point, c) })).sort((a, b) => a.d - b.d)[0];
  return best.d <= FAR_KM ? best.c : null;
}
/** Is the point within reach of this city (the same distance rule as nearestCity)? */
export const isInCity = (city, point) => Boolean(city) && isPoint(point) && km(point, city) <= FAR_KM;
export const isFarFromAll = (cities, point) => isPoint(point) && nearestCity(cities, point) === null;

export const filterByCity = (list, cityId) => (Array.isArray(list) ? list.filter((h) => !cityId || h.city_id === cityId) : []);

/** Where a simulated emergency starts in this city. Never a real address. */
export const startPoint = (city) => (city && city.simulation_start
  ? { lat: city.simulation_start.lat, lng: city.simulation_start.lng, accuracy: 50 } : null);

// Web-Mercator, so the zoom number from /cities means what it means on any web map (256 px tiles).
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
/**
 * Pins for a small vector map: the city centre sits in the middle. The scale comes from the city's zoom;
 * when a point would fall outside the box the map zooms out until everything fits (with a small margin).
 */
export function mapPins(city, hospitals, start, { width, height }, margin = 24) {
  const centre = { x: width / 2, y: height / 2 };
  if (!city) return { centre, pins: [], start: null, scale: 1 };
  const worldPx = (zoom) => 256 * 2 ** zoom;
  const offset = (p, scalePx) => ({
    x: ((p.lng - city.lng) / 360) * scalePx,
    y: -((mercY(p.lat) - mercY(city.lat)) / (2 * Math.PI)) * scalePx,
  });
  const points = [...(hospitals || []), ...(isPoint(start) ? [start] : [])].filter(isPoint);
  let scalePx = worldPx(city.zoom);
  for (let i = 0; i < 12; i += 1) { // zoom out in half steps until everything fits
    const fits = points.every((p) => { const o = offset(p, scalePx); return Math.abs(o.x) <= width / 2 - margin && Math.abs(o.y) <= height / 2 - margin; });
    if (fits) break;
    scalePx /= 1.4;
  }
  const place = (p) => { const o = offset(p, scalePx); return { x: centre.x + o.x, y: centre.y + o.y }; };
  return {
    centre, scale: scalePx / worldPx(city.zoom),
    pins: (hospitals || []).filter(isPoint).map((h) => ({ id: h.id, ...place(h) })),
    start: isPoint(start) ? place(start) : null,
  };
}
