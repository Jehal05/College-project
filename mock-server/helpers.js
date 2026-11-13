// Small helper functions: fake delay, auth check, distance maths, random vitals.
const { tokens } = require('./store');

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

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// Normal resting vitals for a healthy-looking simulated patient.
function normalVitals() {
  return {
    heart_rate: randomInt(70, 76),
    spo2: randomInt(97, 99),
    bp: '120/80',
    glucose: 105,
    resp_rate: 16,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { delay, requireAuth, distanceKm, normalVitals };
