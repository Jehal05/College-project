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
const DEMO_LOCATION = { lat: 23.0225, lng: 72.5714, accuracy: 50 }; // Ahmedabad (same as the portal's demo location)

// What each emergency type needs from a hospital: [capability key, availability key that must also be true].
const REQUIRED = {
  HEART: ['cath_lab', 'cath_lab_ready'], STROKE: ['stroke_unit', 'stroke_unit_ready'], ASTHMA: ['icu', null], DIABETIC: ['emergency', null],
};

// Ranks the verified hospitals: suitable ones first (capability present and ready), then by distance.
// Stand-in for Puneet's ranking; rank 1 is the one alerted. Returns [{ ...hospital, distance_km, rank, suitable }].
function rankHospitals(type, location, list = hospitals) {
  const where = location || DEMO_LOCATION;
  const [cap, ready] = REQUIRED[type] || ['emergency', null];
  const scored = list.filter((h) => h.verified).map((h) => ({
    ...h, distance_km: Number(distanceKm(where.lat, where.lng, h.lat, h.lng).toFixed(2)),
    suitable: Boolean(h.capabilities[cap] && (!ready || h.availability[ready]) && h.capabilities.emergency),
  }));
  scored.sort((a, b) => (Number(b.suitable) - Number(a.suitable)) || (a.distance_km - b.distance_km));
  return scored.map((h, i) => ({ ...h, rank: i + 1 }));
}

function chooseHospital(type, location) { return rankHospitals(type, location)[0] || null; }

module.exports = { delay, requireAuth, distanceKm, chooseHospital, rankHospitals, DEMO_LOCATION };
