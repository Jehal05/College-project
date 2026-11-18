// All REST endpoints of the mock API. Shapes match the shared API contract.
const demoAccounts = require('./demoAccounts');
const guards = require('./guards');
const express = require('express');
const crypto = require('crypto');
const store = require('./store');
const simulator = require('./simulator');
const { requireAuth, distanceKm, DEMO_LOCATION, cityById, cityStart } = require('./helpers');
const { hospitalView } = require('./hospitalAdmin');
const vitals = require('./vitals');
const demoState = require('./demoState');

const router = express.Router();
router.use('/patients/:id', guards.ownRecordOnly); // a patient login only reaches its own record (same 404 as a missing patient)
// Contacts and consents have their own endpoints now (patientData.js), so the profile PATCH ignores contacts.
const EDITABLE = ['name', 'age', 'sex', 'blood_group', 'allergies', 'conditions',
  'medications', 'language', 'consents', 'home_city_id'];

// Health check (no login needed) so teammates can test the connection.
router.get('/health', (req, res) => res.json({ status: 'ok', mock: true }));

// Local presenter panel only: the five demo logins for this run. Refused for any non-loopback caller.
router.get('/demo/accounts', (req, res) => {
  const ip = req.socket.remoteAddress || '';
  if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip)) return res.status(403).json({ error: 'Local only' });
  res.json({ accounts: demoAccounts.accounts(), sandbox: true });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!guards.loginAllowed(req)) return res.status(429).json({ error: 'Too many tries. Wait a minute and try again.' });
  const user = store.users.find((u) => u.email === email && demoAccounts.passwordMatches(u, password));
  if (!user) { guards.loginFailed(req); return res.status(401).json({ error: 'Invalid email or password' }); }
  if (user.disabled) return res.status(403).json({ error: 'This account is disabled' });
  const token = crypto.randomBytes(16).toString('hex');
  store.tokens.set(token, user);
  res.json({ token, role: user.role, patient_id: user.patient_id, ...(user.hospital_id ? { hospital_id: user.hospital_id } : {}) });
});

router.get('/patients/:id', requireAuth, (req, res) => {
  const patient = store.patients[req.params.id];
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

router.patch('/patients/:id', requireAuth, (req, res) => {
  const patient = store.patients[req.params.id];
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if ('home_city_id' in req.body && !(typeof req.body.home_city_id === 'string' && cityById(req.body.home_city_id))) {
    return res.status(400).json({ error: 'home_city_id must be one of ' + store.cities.map((c) => c.city_id).join(', ') });
  }
  for (const key of EDITABLE) {
    if (key in req.body) patient[key] = req.body[key];
  }
  res.json(patient);
});

router.get('/patients/:id/vitals', requireAuth, (req, res) => {
  if (!store.patients[req.params.id]) return res.status(404).json({ error: 'Patient not found' });
  res.json(vitals.currentVitals(req.params.id));
});

// Consents, contacts, reports and baseline (Phase 3) live in their own file.
router.use(require('./patientData'));
router.use(require('./passport')); // QR health passport (Phase 5)
router.use(require('./reminders')); // medication reminders (Phase 6)
router.use(require('./preferences')); // safety check-in setting (Phase 6)
router.use(require('./summaries')); // past alerts and post-incident summary (Phase 6)
router.use(demoState.router); // demo speed, vitals profiles (Phase 6)
router.use(require('./demoScenario'));
router.use(require('./hospitalMode').router); // portal-driven hospital steps, ambulances (Phase 7)
router.use(require('./hospitalAdmin')); // availability, staff passport audit, GET /audit (Phase 9)
router.use(require('./otherApps').router); // family, responder, admin, content, feedback, privacy (Phase 10)

// ---- Emergency endpoints (Phase 2): create, send SOS, cancel, read ----
// Check a type and symptom IDs. Returns an error text or null.
const SOURCES = ['MANUAL', 'FALL_CHECK', 'INACTIVITY_CHECK'];
function checkEmergencyBody({ patient_id, type, symptoms, source }) {
  if (source !== undefined && !SOURCES.includes(source)) return 'source must be one of ' + SOURCES.join(', ');
  // The safety check-in starts an alert without symptoms and without a type (type UNKNOWN).
  const fromCheckIn = source === 'FALL_CHECK' || source === 'INACTIVITY_CHECK';
  if (fromCheckIn && type === 'UNKNOWN' && Array.isArray(symptoms) && symptoms.length === 0 && patient_id) return null;
  if (!patient_id || !store.emergencyTypes[type]) return 'patient_id and a valid type are required';
  if (!Array.isArray(symptoms) || symptoms.length === 0) return 'symptoms must be a non-empty list of symptom IDs';
  const unknown = symptoms.find((id) => !store.emergencyTypes[type].includes(id));
  return unknown ? 'Unknown symptom ID for ' + type + ': ' + unknown : null;
}

router.post('/emergencies', requireAuth, (req, res) => {
  const problem = checkEmergencyBody(req.body || {});
  if (problem) return res.status(400).json({ error: problem });
  const e = simulator.createEmergency(req.body);
  res.status(201).json({ id: e.id, state: e.state, severity: e.severity, source: e.source });
});

const findEmergency = (req, res) => {
  const e = store.emergencies.get(req.params.id);
  if (!e) res.status(404).json({ error: 'Emergency not found' });
  return e;
};

// Starts the simulated hospital response. Sending it twice is harmless (same answer).
router.post('/emergencies/:id/sos', requireAuth, (req, res) => {
  const e = findEmergency(req, res);
  if (!e) return;
  if (e.state === 'CANCELLED') return res.status(409).json({ error: 'Emergency was cancelled' });
  if (e.state === 'EMERGENCY_DETECTED') {
    const loc = req.body && req.body.location;
    simulator.sendSos(e, loc ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, source: loc.source } : null);
  }
  res.json({ id: e.id, state: e.state, hospital: e.hospital });
});

router.use('/', require('./live').router); // live GPS and heart rate from the patient's phone (live.js)

router.post('/emergencies/:id/cancel', requireAuth, (req, res) => {
  const e = findEmergency(req, res);
  if (!e) return;
  if (e.state === 'HANDOVER_DONE') return res.status(409).json({ error: 'Emergency already finished' });
  // Manual hospital mode follows Daksh's table: CANCELLED only before AMBULANCE_DISPATCHED.
  if (process.env.HOSPITAL_MODE === 'manual' && ['AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED'].includes(e.state)) {
    return res.status(409).json({ error: 'Invalid transition', detail: 'Invalid transition', from: e.state, to: 'CANCELLED' });
  }
  if (e.state !== 'CANCELLED') simulator.cancelEmergency(e);
  res.json({ id: e.id, state: e.state });
});

router.get('/emergencies/:id', requireAuth, (req, res) => {
  const e = findEmergency(req, res);
  if (e) res.json(e);
});

// Why the alert fired: what the person reported, what the readings showed, which checklist rules matched.
router.get('/emergencies/:id/reasons', requireAuth, (req, res) => {
  const e = findEmergency(req, res);
  if (e) res.json(e.reasons);
});

function resetDemo(req, res) {
  simulator.stopAll();
  store.resetStore();
  require('./persist').wipe();
  demoState.reset();
  require('./failMode').reset();
  require('./otherApps').reset();
  res.json({ ok: true });
}
router.post('/demo/reset', requireAuth, resetDemo);
// The Reset button on the /start page: no login, but only from the computer that runs the demo.
router.post('/demo/reset-local', (req, res) => {
  const ip = req.socket.remoteAddress || '';
  if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip)) return res.status(403).json({ error: 'Local only' });
  resetDemo(req, res);
});

// The vitals buttons on the /start page: switch the simulated wearable between Resting and Heart emergency. Local computer only.
router.post('/demo/vitals-local', (req, res) => {
  const ip = req.socket.remoteAddress || '';
  if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip)) return res.status(403).json({ error: 'Local only' });
  const profile = req.body && req.body.profile;
  const patientId = req.body && req.body.patient_id;
  if (!vitals.PROFILES[profile]) return res.status(400).json({ error: 'profile must be one of ' + Object.keys(vitals.PROFILES).join(', ') });
  const { status, body } = vitals.applyChange({ profile, ...(patientId ? { patient_id: patientId } : {}) }, (id) => Boolean(store.patients[id]));
  res.status(status).json(body);
});

// Real phone alerts: which channels are set up (no secrets), and a test message. Local computer only, like the other /start buttons.
const loopback = (req) => /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '');
router.get('/demo/live-status', (req, res) => {
  if (!loopback(req)) return res.status(403).json({ error: 'Local only' });
  res.json({ phone_alerts: require('./notify').channels(), storage: require('./persist').summary() });
});
router.post('/demo/notify-test-local', async (req, res) => {
  if (!loopback(req)) return res.status(403).json({ error: 'Local only' });
  const results = await require('./notify').testMessage();
  res.json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, channels: [...new Set(results.map((r) => r.channel))] });
});

// Which profile each patient has now (the /start page shows it). Local computer only.
router.get('/demo/vitals-profiles', (req, res) => {
  if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '')) return res.status(403).json({ error: 'Local only' });
  res.json({ patients: Object.values(store.patients).map((p) => ({ id: p.id, name: p.name, profile: vitals.profileOf(p.id) })), profiles: Object.keys(vitals.PROFILES) });
});

// The cities the apps offer (same answer as the backend's GET /cities).
router.get('/cities', requireAuth, (req, res) => res.json(store.cities));

// Hospitals sorted by distance from lat/lng. Without a point: the start of the chosen city, else the default city's start.
// ?city_id= keeps one city; an unknown id is a 400, never an empty list.
router.get('/hospitals', requireAuth, (req, res) => {
  const cityId = req.query.city_id;
  if (cityId !== undefined && !cityById(cityId)) return res.status(400).json({ error: 'city_id must be one of ' + store.cities.map((c) => c.city_id).join(', ') });
  const start = cityId ? cityStart(cityId) : DEMO_LOCATION;
  const lat = parseFloat(req.query.lat) || start.lat;
  const lng = parseFloat(req.query.lng) || start.lng;
  const list = store.hospitals
    .filter((h) => !cityId || h.city_id === cityId)
    .map((h) => hospitalView(h, lat, lng))
    .sort((a, b) => a.distance_km - b.distance_km);
  res.json(list);
});

module.exports = router;
