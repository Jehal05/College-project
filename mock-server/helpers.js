// Small helper functions: fake delay, auth check, distance maths, random vitals.
const { tokens, hospitals } = require('./store');

// Adds a 200-400 ms delay so loading states can be tested in the app.
function delay(req, res, next) {
  setTimeout(next, 200 + Math.random() * 200);
}

// Rejects the request with 401 unless a valid "Authorization: Bearer <token>" header is sent.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  const user = tokens.get(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

// Distance in km between two coordinates (haversine formula).
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Demo location used when the patient app sends no location (same as the app's demo location).
const DEMO_LOCATION = { lat: 21.1702, lng: 72.8311, accuracy: 50 };

// What each emergency type needs from a hospital.
const REQUIRED_CAPABILITY = {
  HEART: 'CARDIAC_CATH_LAB', STROKE: 'STROKE_UNIT', ASTHMA: 'PULMONOLOGY', DIABETIC: 'EMERGENCY',
};

// PLACEHOLDER for Puneet's real hospital ranking (feature 15).
// Picks the nearest verified, available hospital with the needed capability;
// falls back to the nearest verified, available hospital with EMERGENCY.
function chooseHospital(type, location) {
  const where = location || DEMO_LOCATION;
  const withDistance = hospitals
    .filter((h) => h.verified && h.available)
    .map((h) => ({ ...h, distance_km: Number(distanceKm(where.lat, where.lng, h.lat, h.lng).toFixed(2)) }))
    .sort((a, b) => a.distance_km - b.distance_km);
  const needed = REQUIRED_CAPABILITY[type];
  return withDistance.find((h) => h.capabilities.includes(needed)) ||
    withDistance.find((h) => h.capabilities.includes('EMERGENCY')) || null;
}

module.exports = { delay, requireAuth, distanceKm, chooseHospital, DEMO_LOCATION };
