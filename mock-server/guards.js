// Small guards for the mock API, kept apart from routes.js so they can be tested without a server.
const store = require('./store');

const bearer = (req) => ((req.headers && req.headers.authorization) || '').replace('Bearer ', '');

// A patient login sees only its own record. Asking for someone else's gives the same 404 as a patient that does not exist.
function ownRecordOnly(req, res, next) {
  const user = store.tokens.get(bearer(req));
  if (user && user.role === 'PATIENT' && user.patient_id !== req.params.id) return res.status(404).json({ error: 'Patient not found' });
  next();
}

// "Only from the computer that runs the demo". The address must be loopback AND the request must not have come through a tunnel
// (Cloudflare Tunnel, ngrok and similar connect from 127.0.0.1 but add forwarding headers and keep the public Host name).
const LOOPBACK = /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
const FORWARD_HEADERS = ['x-forwarded-for', 'x-forwarded-host', 'forwarded', 'cf-connecting-ip', 'cf-ray', 'x-real-ip', 'ngrok-skip-browser-warning'];
function isLocal(req) {
  if (!LOOPBACK.test((req.socket && req.socket.remoteAddress) || '')) return false;
  const h = req.headers || {};
  if (FORWARD_HEADERS.some((k) => h[k] !== undefined)) return false;
  return LOCAL_HOST.test(h.host || '');
}
const localOnly = (req, res, next) => (isLocal(req) ? next() : res.status(403).json({ error: 'Local only' }));

// A patient login reaches only its own alerts. Staff and the other roles are unchanged. Same 404 as a missing alert.
function emergencyScope(req, res, next) {
  const user = store.tokens.get(bearer(req));
  if (!user || user.role !== 'PATIENT') return next();
  const parts = req.path.split('/').filter(Boolean);
  if (!parts.length) {
    if (req.method !== 'POST') return res.status(403).json({ error: 'Not allowed' }); // the list of all alerts is for staff
    const pid = req.body && req.body.patient_id;
    return pid && pid !== user.patient_id ? res.status(403).json({ error: 'You can only start an emergency for yourself' }) : next();
  }
  const e = store.emergencies.get(parts[0]);
  return e && e.patient_id !== user.patient_id ? res.status(404).json({ error: 'Emergency not found' }) : next();
}
// Patients never move ambulances.
const staffWrites = (req, res, next) => {
  const user = store.tokens.get(bearer(req));
  return user && user.role === 'PATIENT' && req.method !== 'GET' ? res.status(403).json({ error: 'Not allowed' }) : next();
};

// Too many wrong passwords from one address in a minute: 429. Right passwords never count.
const FAILS = new Map();
const WINDOW_MS = 60000, MAX_FAILS = 10;
const addr = (req) => (req.socket && req.socket.remoteAddress) || 'x';
function loginAllowed(req) {
  const now = Date.now();
  const list = (FAILS.get(addr(req)) || []).filter((t) => now - t < WINDOW_MS);
  FAILS.set(addr(req), list);
  return list.length < MAX_FAILS;
}
const loginFailed = (req) => { const l = FAILS.get(addr(req)) || []; l.push(Date.now()); FAILS.set(addr(req), l); };

const clientKey = (req) => String((req.headers && (req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim())) || addr(req));

module.exports = { isLocal, localOnly, emergencyScope, staffWrites, clientKey, ownRecordOnly, loginAllowed, loginFailed };
