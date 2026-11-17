// Which hospitals, ambulances and alerts belong to the city the desk is looking at. Pure functions, no React.
// The list of cities comes from GET /cities (or src/data/cities.json in mock mode): nothing here has coordinates of its own.

export const ALL_CITIES = 'all';
const FAR_KM = 80;

const rad = (d) => (d * Math.PI) / 180;
function km(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const isPoint = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

export const filterByCity = (list, cityId) => (Array.isArray(list) ? list.filter((x) => cityId === ALL_CITIES || !cityId || x.city_id === cityId) : []);

export const cityOfHospital = (hospitals, id) => {
  if (id == null) return null;
  const h = (hospitals || []).find((x) => String(x.id) === String(id));
  return h && h.city_id ? h.city_id : null;
};

/** The nearest city to a point, or null when the point is farther than 80 km from every city. */
export function nearestCityId(cities, point) {
  if (!isPoint(point) || !Array.isArray(cities) || !cities.length) return null;
  const best = cities.map((c) => ({ id: c.city_id, d: km(point, c) })).sort((a, b) => a.d - b.d)[0];
  return best.d <= FAR_KM ? best.id : null;
}

/** The city of an alert: the hospital that holds it now, else the city named in the alert, else the city nearest its location. Else null. */
export function alertCityId(alert, hospitals, cities) {
  return cityOfHospital(hospitals, alert && alert.alerted_hospital_id)
    || (alert && alert.city_id) || nearestCityId(cities, alert && alert.location) || null;
}

/** An alert whose city cannot be known is always kept: an alert is never lost by a filter. */
export function filterAlerts(alerts, cityId, hospitals, cities) {
  if (!Array.isArray(alerts)) return [];
  if (cityId === ALL_CITIES || !cityId) return alerts;
  return alerts.filter((a) => { const c = alertCityId(a, hospitals, cities); return c === null || c === cityId; });
}

/** Where the desk starts: staff in the city of their hospital, admin the same when known, else the first city. */
export function defaultCityId(session, hospitals, cities) {
  const own = cityOfHospital(hospitals, session && session.hospital_id);
  if (own && (cities || []).some((c) => c.city_id === own)) return own;
  return cities && cities.length ? cities[0].city_id : null;
}

export function startPointOf(cities, cityId) {
  const c = (cities || []).find((x) => x.city_id === cityId);
  return c && c.simulation_start ? { lat: c.simulation_start.lat, lng: c.simulation_start.lng, label: c.simulation_start.label } : null;
}

export function showingLabel(cities, cityId) {
  const c = (cities || []).find((x) => x.city_id === cityId);
  return c ? c.city_name + ', ' + c.state : null;
}
