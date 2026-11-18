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

// Lookup is by SHA-256 of the token (like the backend). The raw token is kept only as the owner's copy so the patient can see the QR again.
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const findByToken = (t) => store.passportTokens.get(hashToken(t)) || null;

// Only the patient who owns the record may manage its passport. Staff and admins read through GET /passport/:id, which is audited.
function owner(req, res, next) {
  const { role, patient_id, email } = req.user;
  if (role !== 'PATIENT' || patient_id !== req.params.id) {
    audit.record({ user: email, role, action: 'passport.manage', patient_id: req.params.id, outcome: 'denied', reason: 'not_owner' });
    return res.status(403).json({ error: 'Not your passport' });
  }
  next();
}

// Public link rate limit: 30 opens per minute per address. Kept in memory.
const hits = new Map();
function limit(req, res, next) {
  const k = require('./guards').clientKey(req), now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < 60000);
  if (list.length >= 30) { hits.set(k, list); return res.status(429).json({ error: 'Too many requests. Try again in a minute.' }); }
  list.push(now); hits.set(k, list);
  next();
}

const current = (patientId) => store.passports[patientId] || null;
const isLive = (p) => p && !p.revoked && Date.parse(p.expires_at) > Date.now();

router.post('/patients/:id/passport', requireAuth, owner, (req, res) => {
  if (!store.patients[req.params.id]) return res.status(404).json({ error: 'Patient not found' });
  const hours = Number((req.body && req.body.hours) || 24);
  if (!HOURS.includes(hours)) return res.status(400).json({ error: 'hours must be 1, 24 or 168' });
  const fields = req.body && req.body.fields;
  if (fields !== undefined && !(Array.isArray(fields) && fields.every((f) => QR_FIELDS.includes(f)))) return res.status(400).json({ error: 'fields must be a list of: ' + QR_FIELDS.join(', ') });
  const old = current(req.params.id);
  if (old) { old.revoked = true; audit.record({ user: req.user.email, role: req.user.role, action: 'passport.rotate', patient_id: req.params.id }); } // only one live link at a time
  const passport = {
    token: crypto.randomBytes(18).toString('base64url'), // 24 URL-safe characters
    patient_id: req.params.id, created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + hours * 3600 * 1000).toISOString(), revoked: false, log: [], scope: fields || QR_FIELDS,
  };
  store.passports[req.params.id] = passport;
  store.passportTokens.set(hashToken(passport.token), passport);
  audit.record({ user: req.user.email, role: req.user.role, action: 'passport.create', patient_id: req.params.id });
  res.status(201).json({ token: passport.token, expires_at: passport.expires_at, fields: passport.scope });
});

// The patient's current passport (or 404), so the screen can show it again after a reload.
router.get('/patients/:id/passport', requireAuth, owner, (req, res) => {
  const p = current(req.params.id);
  if (!isLive(p)) return res.status(404).json({ error: 'No active passport' });
  res.json({ token: p.token, expires_at: p.expires_at, fields: p.scope || QR_FIELDS });
});

router.delete('/patients/:id/passport', requireAuth, owner, (req, res) => {
  const p = current(req.params.id);
  if (p) { p.revoked = true; audit.record({ user: req.user.email, role: req.user.role, action: 'passport.revoke', patient_id: req.params.id }); } // the token stays known so the link answers 410, not 404
  res.json({ ok: true });
});

// Only times. No IP address, no device information.
router.get('/patients/:id/passport/log', requireAuth, owner, (req, res) => {
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

// Where the QR should point. A phone cannot open localhost, so the patient app warns when this is empty or local.
router.get('/public-config', (req, res) => res.json({ public_url: (process.env.PUBLIC_URL || '').replace(/\/$/, '') || null }));

// Exactly what an anonymous scan would show for the chosen fields, without making a link (owner only).
router.get('/patients/:id/passport/preview', requireAuth, owner, (req, res) => {
  const raw = req.query.fields === undefined ? QR_FIELDS : String(req.query.fields).split(',').filter(Boolean);
  if (!raw.every((f) => QR_FIELDS.includes(f))) return res.status(400).json({ error: 'fields must be a list of: ' + QR_FIELDS.join(', ') });
  const now = new Date();
  res.json(publicBody(store.patients[req.params.id], { scope: raw, created_at: now.toISOString(), expires_at: new Date(now.getTime() + 24 * 3600e3).toISOString() }));
});

// Who looked, when, and whether it worked. Kinds only: no names, IP addresses or devices.
router.get('/patients/:id/passport/history', requireAuth, owner, (req, res) => {
  const rows = store.accessLog.filter((r) => r.patient_id === req.params.id && ['passport.view', 'passport.staff_view'].includes(r.action))
    .map((r) => ({ at: r.at, who: r.role === 'public' ? 'anonymous' : 'staff', purpose: r.purpose || null, outcome: r.outcome }));
  res.json(rows.reverse().slice(0, 50));
});

// Staff read (protected clinical view). Order of checks: role, patient exists, purpose, hospital scope. Every outcome is audited.
// There is no anonymous override and no "emergency access" here; that needs a clinical and legal review first.
const PURPOSES = ['emergency_treatment', 'admission_check', 'ambulance_handover', 'follow_up'];
const hospitalCity = (id) => { const h = store.hospitals.find((x) => x.id === id); return h ? h.city_id : null; };

function clinicalRead(req, res, id, purpose) {
  const { role, email, hospital_id } = req.user;
  const patient = store.patients[id];
  const deny = (code, reason, message) => {
    audit.record({ user: email, role, action: 'passport.staff_view', patient_id: patient ? id : null, outcome: 'denied', reason, purpose: PURPOSES.includes(purpose) ? purpose : null });
    return res.status(code).json({ error: message });
  };
  if (!['HOSPITAL_STAFF', 'ADMIN'].includes(role)) return deny(403, 'role', 'Hospital staff only');
  if (!patient) return res.status(404).json({ error: 'No passport found for this patient' });
  if (!PURPOSES.includes(purpose)) return deny(400, 'purpose_required', 'purpose is required: ' + PURPOSES.join(', '));
  // Scope: hospital staff may open patients whose home city is the city of their own hospital. Admins are not limited.
  if (role === 'HOSPITAL_STAFF' && !(hospital_id && hospitalCity(hospital_id) === patient.home_city_id)) return deny(403, 'other_hospital', 'This patient is outside your hospital');
  const row = audit.record({ user: email, role, action: 'passport.staff_view', patient_id: id, purpose, fields: sharedFields(patient) });
  const live = current(id);
  res.json(passportBody(patient, { patient_id: id, purpose, audit_ref: row.ref, passport_expires_at: isLive(live) ? live.expires_at : null, demo: true }));
}
const staffRead = (req, res, id) => clinicalRead(req, res, id, String(req.query.purpose || ''));

// Staff scan: the QR token (pasted or scanned) is turned into a patient on the server; the person must be signed in. Neutral 410 for any bad token.
router.post('/passport/resolve', limit, requireAuth, (req, res) => {
  const p = findByToken((req.body && req.body.token) || '');
  if (!isLive(p)) {
    audit.record({ user: req.user.email, role: req.user.role, action: 'passport.staff_view', outcome: 'denied', reason: 'expired_or_revoked' });
    return res.status(410).json(GONE);
  }
  clinicalRead(req, res, p.patient_id, String((req.body && req.body.purpose) || ''));
});
router.get('/passport/purposes', (req, res) => res.json({ purposes: PURPOSES }));

// What an anonymous scan may see. Default-safe list only; the consent switches are the upper limit.
// Conditions, medicines, reports, vitals, location, login id and the token are never returned here.
const maskPhone = (phone) => { const d = String(phone || '').replace(/\D/g, ''); return d.length >= 4 ? '+91 XXXXX XXX' + d.slice(-2) : 'XXXXX'; };
const ageBand = (age) => { const a = Number(age); if (!Number.isFinite(a)) return null; const lo = Math.floor(a / 10) * 10; return lo + '-' + (lo + 9); };
const QR_FIELDS = ['blood_group', 'allergies', 'contact']; // what the patient can switch on for the QR (all on by default)
function publicBody(patient, p) {
  const scope = p.scope || QR_FIELDS;
  const history = Boolean(patient.consents.history);
  const on = (k) => scope.includes(k);
  const first = (patient.contacts || [])[0];
  return {
    demo: true, name: patient.name, patient_code: 'HT-' + String(patient.id).slice(-4), age_band: ageBand(patient.age),
    ...(on('blood_group') ? { blood_group: patient.blood_group } : {}),
    ...(on('allergies') && history ? { allergies: patient.allergies } : {}),
    ...(on('contact') && history && first ? { contact: { name: first.name, relation: first.relation, phone_masked: maskPhone(first.phone) } } : {}),
    ...(patient.medical_alert ? { medical_alert: patient.medical_alert } : {}),
    source: 'simulated', last_updated: p.created_at, link_valid: true, expires_at: p.expires_at,
  };
}

// Two kinds of address: a random QR token (public, no login) or a patient id (staff login needed). A token always wins.
router.get('/passport/:token', limit, (req, res) => {
  const p = findByToken(req.params.token);
  if (p) {
    if (!isLive(p)) { audit.record({ user: 'qr_link', role: 'public', action: 'passport.view', patient_id: p.patient_id, outcome: 'denied', reason: 'expired_or_revoked' }); return res.status(410).json(GONE); }
    const patient = store.patients[p.patient_id];
    const opened_at = new Date().toISOString();
    p.log.push(opened_at);
    audit.record({ user: 'qr_link', role: 'public', action: 'passport.view', patient_id: p.patient_id, fields: sharedFields(patient) });
    simulator.broadcast({ type: 'passport.opened', emergency_id: null, state: 'MONITORING', timestamp: opened_at, payload: { patient_id: p.patient_id } });
    return res.json(publicBody(patient, p));
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
  const p = current(req.user.patient_id || 'PT-2026-0417');
  if (p) p.expires_at = new Date(Date.now() - 1000).toISOString();
  res.json({ ok: true });
});

module.exports = router;
module.exports.findByToken = findByToken;
module.exports.hashToken = hashToken;
