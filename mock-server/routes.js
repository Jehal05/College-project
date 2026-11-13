// All REST endpoints of the mock API. Shapes match the shared API contract.
const express = require('express');
const crypto = require('crypto');
const store = require('./store');
const { requireAuth, distanceKm, normalVitals } = require('./helpers');

const router = express.Router();
const EDITABLE = ['name', 'age', 'sex', 'blood_group', 'allergies', 'conditions',
  'medications', 'language', 'contacts', 'consents'];

// Health check (no login needed) so teammates can test the connection.
router.get('/health', (req, res) => res.json({ status: 'ok', mock: true }));

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = store.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  const token = crypto.randomBytes(16).toString('hex');
  store.tokens.set(token, user);
  res.json({ token, role: user.role, patient_id: user.patient_id });
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
  res.json(normalVitals());
});

// ---- Emergency endpoints are stubs for Phase 2 ----
router.post('/emergencies', requireAuth, (req, res) => {
  const { patient_id, type, symptoms = [], location = null } = req.body || {};
  if (!patient_id || !store.emergencyTypes[type]) {
    return res.status(400).json({ error: 'patient_id and a valid type are required' });
  }
  const id = store.nextEmergencyId();
  const now = new Date().toISOString();
  const emergency = {
    id, patient_id, type, symptoms, location,
    state: 'EMERGENCY_DETECTED', severity: 'EMERGENCY',
    status_events: [{ state: 'EMERGENCY_DETECTED', timestamp: now }],
  };
  store.emergencies.set(id, emergency);
  res.status(201).json({ id, state: emergency.state, severity: emergency.severity });
});

router.post('/emergencies/:id/cancel', requireAuth, (req, res) => {
  const emergency = store.emergencies.get(req.params.id);
  if (!emergency) return res.status(404).json({ error: 'Emergency not found' });
  emergency.state = 'CANCELLED';
  emergency.status_events.push({ state: 'CANCELLED', timestamp: new Date().toISOString() });
  res.json({ id: emergency.id, state: emergency.state });
});

router.get('/emergencies/:id', requireAuth, (req, res) => {
  const emergency = store.emergencies.get(req.params.id);
  if (!emergency) return res.status(404).json({ error: 'Emergency not found' });
  res.json(emergency);
});

// Hospitals sorted by distance from lat/lng (defaults to a demo point in Surat).
router.get('/hospitals', requireAuth, (req, res) => {
  const lat = parseFloat(req.query.lat) || 21.1702;
  const lng = parseFloat(req.query.lng) || 72.8311;
  const list = store.hospitals
    .map((h) => ({ ...h, distance_km: Number(distanceKm(lat, lng, h.lat, h.lng).toFixed(2)) }))
    .sort((a, b) => a.distance_km - b.distance_km);
  res.json(list);
});

module.exports = router;
