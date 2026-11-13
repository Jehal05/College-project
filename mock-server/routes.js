// All REST endpoints of the mock API. Shapes match the shared API contract.
const express = require('express');
const crypto = require('crypto');
const store = require('./store');
const simulator = require('./simulator');
const { requireAuth, distanceKm, DEMO_LOCATION } = require('./helpers');
const { hospitalView } = require('./hospitalAdmin');
const vitals = require('./vitals');
const demoState = require('./demoState');

const router = express.Router();
// Contacts and consents have their own endpoints now (patientData.js), so the profile PATCH ignores contacts.
const EDITABLE = ['name', 'age', 'sex', 'blood_group', 'allergies', 'conditions',
  'medications', 'language', 'consents'];

// Health check (no login needed) so teammates can test the connection.
router.get('/health', (req, res) => res.json({ status: 'ok', mock: true }));

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = store.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
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
  for (const key of EDITABLE) {
    if (key in req.body) patient[key] = req.body[key];
  }
  res.json(patient);
});

router.get('/patients/:id/vitals', requireAuth, (req, res) => {
  if (!store.patients[req.params.id]) return res.status(404).json({ error: 'Patient not found' });
  res.json(vitals.currentVitals());
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

router.post('/demo/reset', requireAuth, (req, res) => {
  simulator.stopAll();
  store.resetStore();
  demoState.reset();
  require('./failMode').reset();
  res.json({ ok: true });
});

// Hospitals sorted by distance from lat/lng (defaults to the Ahmedabad demo point).
router.get('/hospitals', requireAuth, (req, res) => {
  const lat = parseFloat(req.query.lat) || DEMO_LOCATION.lat;
  const lng = parseFloat(req.query.lng) || DEMO_LOCATION.lng;
  const list = store.hospitals
    .map((h) => hospitalView(h, lat, lng))
    .sort((a, b) => a.distance_km - b.distance_km);
  res.json(list);
});

module.exports = router;
