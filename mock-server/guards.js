// Small guards for the mock API, kept apart from routes.js so they can be tested without a server.
const store = require('./store');

const bearer = (req) => ((req.headers && req.headers.authorization) || '').replace('Bearer ', '');

// A patient login sees only its own record. Asking for someone else's gives the same 404 as a patient that does not exist.
function ownRecordOnly(req, res, next) {
  const user = store.tokens.get(bearer(req));
  if (user && user.role === 'PATIENT' && user.patient_id !== req.params.id) return res.status(404).json({ error: 'Patient not found' });
  next();
}

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

module.exports = { ownRecordOnly, loginAllowed, loginFailed };
