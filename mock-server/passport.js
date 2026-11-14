// QR Health Passport (Phase 5). The QR holds only a random token; the data is read from here when the link is opened.
// Tokens live in memory only and are forgotten by POST /demo/reset. All data is FAKE.
const express = require('express');
const crypto = require('crypto');
const store = require('./store');
const simulator = require('./simulator');
const { requireAuth } = require('./helpers');
const audit = require('./audit');

const router = express.Router();
const HOURS = [1, 24, 168]; // allowed validity: 1 hour, 24 hours, 7 days
const PATIENT_ID = /^PT-\d{4}-\d{4}$/;
const GONE = { error: 'This passport is no longer available.' };

const current = (patientId) => store.passports[patientId] || null;
const isLive = (p) => p && !p.revoked && Date.parse(p.expires_at) > Date.now();

router.post('/patients/:id/passport', requireAuth, (req, res) => {
  if (!store.patients[req.params.id]) return res.status(404).json({ error: 'Patient not found' });
  const hours = Number((req.body && req.body.hours) || 24);
  if (!HOURS.includes(hours)) return res.status(400).json({ error: 'hours must be 1, 24 or 168' });
  const old = current(req.params.id);
  if (old) old.revoked = true; // only one passport at a time
  const passport = {
    token: crypto.randomBytes(18).toString('base64url'), // 24 URL-safe characters
    patient_id: req.params.id, created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + hours * 3600 * 1000).toISOString(), revoked: false, log: [],
  };
  store.passports[req.params.id] = passport;
  store.passportTokens.set(passport.token, passport);
  res.status(201).json({ token: passport.token, expires_at: passport.expires_at });
});

// The patient's current passport (or 404), so the screen can show it again after a reload.
router.get('/patients/:id/passport', requireAuth, (req, res) => {
  const p = current(req.params.id);
  if (!isLive(p)) return res.status(404).json({ error: 'No active passport' });
  res.json({ token: p.token, expires_at: p.expires_at });
});

router.delete('/patients/:id/passport', requireAuth, (req, res) => {
  const p = current(req.params.id);
  if (p) p.revoked = true; // the token stays known so the link answers 410, not 404
  res.json({ ok: true });
});

// Only times. No IP address, no device information.
router.get('/patients/:id/passport/log', requireAuth, (req, res) => {
  const p = current(req.params.id);
  res.json(p ? p.log.map((opened_at) => ({ opened_at })) : []);
});

// Same fields for the QR page and for staff. Only what the consents allow; a group that is not shared is simply left out.
function passportBody(patient, extra = {}) {
  const history = Boolean(patient.consents.history);
  const reports = Boolean(patient.consents.reports);
  return {
    name: patient.name, age: patient.age, blood_group: patient.blood_group, ...extra,
    shared: { history, reports },
    ...(history ? { allergies: patient.allergies, conditions: patient.conditions, medications: patient.medications,
      contacts: patient.contacts.map((c) => ({ name: c.name, relation: c.relation, phone: c.phone })) } : {}),
    ...(reports ? { reports: (store.reports[patient.id] || []).map((r) => ({ name: r.name, content_type: r.content_type })) } : {}),
  };
}
const sharedFields = (patient) => ['history', 'reports'].filter((k) => patient.consents[k]);

// Staff read by patient id (Phase 9): GET /passport/PT-2026-0417 with a staff or admin token. Logged every time.
function staffRead(req, res, id) {
  const { role, email } = req.user;
  const patient = store.patients[id];
  if (!['HOSPITAL_STAFF', 'ADMIN'].includes(role)) {
    audit.record({ user: email, role, action: 'passport.staff_view', patient_id: id, outcome: 'denied', reason: 'role' });
    return res.status(403).json({ error: 'Hospital staff only' });
  }
  if (!patient) return res.status(404).json({ error: 'No passport found for this patient' });
  audit.record({ user: email, role, action: 'passport.staff_view', patient_id: id, fields: sharedFields(patient) });
  res.json(passportBody(patient, { patient_id: id }));
}

// Two kinds of address: a random QR token (public, no login) or a patient id (staff login needed). A token always wins.
router.get('/passport/:token', (req, res) => {
  const p = store.passportTokens.get(req.params.token);
  if (p) {
    if (!isLive(p)) { audit.record({ user: 'qr_link', role: 'public', action: 'passport.view', patient_id: p.patient_id, outcome: 'denied', reason: 'expired_or_revoked' }); return res.status(410).json(GONE); }
    const patient = store.patients[p.patient_id];
    const opened_at = new Date().toISOString();
    p.log.push(opened_at);
    audit.record({ user: 'qr_link', role: 'public', action: 'passport.view', patient_id: p.patient_id, fields: sharedFields(patient) });
    simulator.broadcast({ type: 'passport.opened', emergency_id: null, state: 'MONITORING', timestamp: opened_at, payload: { patient_id: p.patient_id } });
    return res.json(passportBody(patient, { expires_at: p.expires_at }));
  }
  if (!PATIENT_ID.test(req.params.token)) return res.status(410).json(GONE); // an unknown token
  requireAuth(req, res, () => {
    if (req.user.role === 'PATIENT' && req.user.patient_id !== req.params.token) return res.status(403).json({ error: 'Not your passport' });
    if (req.user.role === 'PATIENT') return res.json(passportBody(store.patients[req.params.token] || {}, { patient_id: req.params.token }));
    staffRead(req, res, req.params.token);
  });
});

// Demo helper: make the current passport expire now (used by tests and the demo).
router.post('/demo/passport/expire', requireAuth, (req, res) => {
  const p = current('PT-2026-0417');
  if (p) p.expires_at = new Date(Date.now() - 1000).toISOString();
  res.json({ ok: true });
});

module.exports = router;
