// Phase 10: the endpoints behind the family, responder and admin apps (family linking and status, volunteer responders,
// admin user list, medical content with approval, feedback, privacy requests). Shapes follow backend/CONTRACT.md section 4.
// Everything is simulated and kept in memory. POST /demo/reset calls reset(). Never sends passwords, tokens or phone numbers.
const express = require('express');
const crypto = require('crypto');
const store = require('./store');
const audit = require('./audit');
const vitals = require('./vitals');
const { requireAuth } = require('./helpers');

const router = express.Router();
const ROLES = ['PATIENT', 'HOSPITAL_STAFF', 'ADMIN', 'FAMILY', 'RESPONDER'];
const MESSAGES = ['ON_MY_WAY', 'CALLING_NOW', 'CANNOT_REACH'];
const PRIVACY_TYPES = ['EXPORT', 'DELETE'];
const LIVE = ['SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED'];
const DEMO_INVITE = 'FAM-0417';
const SEED_USERS = store.users.length; // users after this index were registered while the mock runs

const seedContent = () => ({
  emergency_numbers: { type: 'emergency_numbers', version: 1, approved: true, approved_by: 'seed', items: ['Ambulance: 108', 'Emergency: 112'] },
  first_aid_basics: { type: 'first_aid_basics', version: 1, approved: false, approved_by: null,
    items: ['Sample text. A doctor has not reviewed this yet, so apps do not show it.'] },
});
const state = { links: new Map(), invites: new Map(), checkins: [], feedback: [], privacy: [], content: seedContent(), counters: { checkin: 0, feedback: 0, privacy: 0 } };

function reset() {
  state.links.clear(); state.invites.clear(); state.checkins.length = 0; state.feedback.length = 0; state.privacy.length = 0;
  state.accepted = new Map(); state.content = seedContent(); Object.keys(state.counters).forEach((k) => { state.counters[k] = 0; });
  store.users.length = SEED_USERS; // forget volunteers that registered
  store.users.forEach((u) => { delete u.disabled; if (u.role === 'RESPONDER') u.verified = u.email === 'responder@demo.test'; });
  state.invites.set(DEMO_INVITE, { patient_id: 'PT-2026-0417', expires_at: null });
}
reset();

const userId = (u) => 'usr_' + String(store.users.indexOf(u) + 1).padStart(3, '0');
const need = (...roles) => (req, res, next) => (roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'This action is not allowed for your role' }));
const linked = (u) => [...(state.links.get(u.email) || [])];
const shared = (p) => ['location', 'history', 'vitals', 'reports'].filter((k) => p.consents && p.consents[k]);
// A field is released only if the patient allowed it when the SOS was sent and still allows it now.
const bothOn = (a, b) => Object.fromEntries(Object.keys(b).map((k) => [k, Boolean(a[k] && b[k])]));
const latestLive = (pid) => [...store.emergencies.values()].filter((e) => e.patient_id === pid && LIVE.includes(e.state)).pop() || null;

// ---------- family ----------
router.post('/patients/:id/family-invites', requireAuth, need('PATIENT'), (req, res) => {
  if (req.user.patient_id !== req.params.id) return res.status(403).json({ error: 'You can only invite family to your own account' });
  const code = 'FAM-' + crypto.randomInt(1000, 9999);
  const expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  state.invites.set(code, { patient_id: req.params.id, expires_at });
  audit.record({ user: req.user.patient_id, role: 'PATIENT', action: 'family.invite_created', patient_id: req.params.id });
  res.status(201).json({ code, expires_at, simulated: true });
});

router.post('/family/link', requireAuth, need('FAMILY'), (req, res) => {
  const code = String((req.body && req.body.invite_code) || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'invite_code is required' });
  const inv = state.invites.get(code);
  if (!inv) return res.status(404).json({ error: 'Invite code not found' });
  if (inv.expires_at && Date.parse(inv.expires_at) <= Date.now()) return res.status(410).json({ error: 'Invite code has expired' });
  const set = state.links.get(req.user.email) || new Set();
  set.add(inv.patient_id); state.links.set(req.user.email, set);
  audit.record({ user: req.user.email, role: 'FAMILY', action: 'family.link', patient_id: inv.patient_id });
  res.json({ patient_id: inv.patient_id, name: store.patients[inv.patient_id].name, linked: true, simulated: true });
});

// What a relative may see: the name always; vitals and location only while the patient's consent for them is on.
function familyView(pid) {
  const p = store.patients[pid];
  const e = latestLive(pid);
  const view = { patient_id: pid, name: p.name, shared_fields: shared(p), simulated: true, active_emergency: null };
  if (p.consents.vitals) { const { timestamp, ...v } = vitals.currentVitals(); view.vitals = { ...v, timestamp }; }
  if (e && e.state !== 'EMERGENCY_DETECTED') {
    const sent = bothOn(e.consents || p.consents, p.consents); // what was shared when the SOS was sent AND what is still shared now
    view.active_emergency = { id: e.id, state: e.state, started_at: e.status_events[0].timestamp,
      ...(e.hospital ? { hospital: { name: e.hospital.name } } : {}), ...(Number.isFinite(e.eta_seconds) ? { eta_seconds: e.eta_seconds } : {}),
      ...(sent.location && e.location ? { location: { lat: e.location.lat, lng: e.location.lng } } : {}),
      checkins: state.checkins.filter((c) => c.emergency_id === e.id).map(({ message, at }) => ({ message, at })) };
  }
  return view;
}

router.get('/family/patients', requireAuth, need('FAMILY'), (req, res) => {
  res.json(linked(req.user).filter((pid) => store.patients[pid]).map(familyView));
});

router.post('/family/checkin', requireAuth, need('FAMILY'), (req, res) => {
  const { patient_id, emergency_id, message } = req.body || {};
  if (!linked(req.user).includes(patient_id)) return res.status(403).json({ error: 'You are not linked to this patient' });
  if (!MESSAGES.includes(message)) return res.status(400).json({ error: 'message must be one of ' + MESSAGES.join(', ') });
  const e = emergency_id ? store.emergencies.get(emergency_id) : latestLive(patient_id);
  if (!e || e.patient_id !== patient_id) return res.status(404).json({ error: 'Emergency not found for this patient' });
  const row = { id: 'FC-' + ++state.counters.checkin, emergency_id: e.id, patient_id, message, at: new Date().toISOString() };
  state.checkins.push(row);
  audit.record({ user: req.user.email, role: 'FAMILY', action: 'family.checkin', patient_id });
  res.status(201).json({ id: row.id, emergency_id: e.id, message, at: row.at, simulated: true });
});

// ---------- responders ----------
router.post('/responders/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'password must have at least 8 characters' });
  const mail = String(email).trim().toLowerCase();
  if (store.users.some((u) => u.email === mail)) return res.status(409).json({ error: 'This email is already registered' });
  const user = { email: mail, password, role: 'RESPONDER', patient_id: null, verified: false, name: String(name).slice(0, 80), registered: true };
  store.users.push(user);
  audit.record({ user: mail, role: 'RESPONDER', action: 'responder.register' });
  res.status(201).json({ id: userId(user), verified: false, simulated: true });
});

const distanceFor = (e) => 400 + (Number(e.id.slice(-4)) % 7) * 150; // fixed fake distance from the responder, in metres
function alertView(e) { return { id: e.id, type: e.type, distance_m: distanceFor(e), state: e.state, accepted: false, simulated: true }; }
const verified = (u) => u.role === 'RESPONDER' && u.verified === true;

router.get('/responders/alerts', requireAuth, need('RESPONDER'), (req, res) => {
  if (!verified(req.user)) return res.status(403).json({ error: 'Your volunteer account is not verified yet' });
  const mine = state.accepted ? state.accepted.get(req.user.email) || new Set() : new Set();
  const list = [...store.emergencies.values()].filter((e) => LIVE.includes(e.state)).map((e) => ({ ...alertView(e), accepted: mine.has(e.id) }));
  res.json(list);
});

// Accepting releases the identity the patient allowed: the name, the age and (with the history consent) allergies. Location needs the location consent.
router.post('/responders/:id/accept', requireAuth, need('RESPONDER'), (req, res) => {
  if (!verified(req.user)) return res.status(403).json({ error: 'Your volunteer account is not verified yet' });
  const e = store.emergencies.get(req.params.id);
  if (!e || !LIVE.includes(e.state)) return res.status(404).json({ error: 'Alert not found or already finished' });
  state.accepted = state.accepted || new Map();
  const set = state.accepted.get(req.user.email) || new Set(); set.add(e.id); state.accepted.set(req.user.email, set);
  const p = store.patients[e.patient_id]; const c = bothOn(e.consents || p.consents, p.consents);
  const patient = { name: p.name, age: p.age, ...(c.history ? { allergies: p.allergies } : {}) };
  audit.record({ user: req.user.email, role: 'RESPONDER', action: 'responder.accept', patient_id: e.patient_id, fields: Object.keys(patient) });
  res.json({ id: e.id, accepted: true, patient, ...(c.location && e.location ? { location: { lat: e.location.lat, lng: e.location.lng } } : {}), simulated: true });
});

// ---------- admin ----------
const userRow = (u) => ({ id: userId(u), email: u.email, role: u.role, disabled: Boolean(u.disabled), ...(u.role === 'RESPONDER' ? { verified: Boolean(u.verified) } : {}),
  ...(u.hospital_id ? { hospital_id: u.hospital_id } : {}), ...(u.patient_id ? { patient_id: u.patient_id } : {}) });

router.get('/admin/users', requireAuth, need('ADMIN'), (req, res) => {
  const role = req.query.role;
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'role must be one of ' + ROLES.join(', ') });
  res.json(store.users.filter((u) => !role || u.role === role).map(userRow));
});

router.patch('/admin/users', requireAuth, need('ADMIN'), (req, res) => {
  const { id, disabled, role, verified: ver } = req.body || {};
  const u = store.users.find((x) => userId(x) === id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (disabled === undefined && role === undefined && ver === undefined) return res.status(400).json({ error: 'Send disabled, role or verified' });
  if (disabled !== undefined && typeof disabled !== 'boolean') return res.status(422).json({ error: 'disabled must be true or false' });
  if (ver !== undefined && typeof ver !== 'boolean') return res.status(422).json({ error: 'verified must be true or false' });
  if (role !== undefined && !ROLES.includes(role)) return res.status(422).json({ error: 'role must be one of ' + ROLES.join(', ') });
  if (u.email === req.user.email && (disabled === true || (role !== undefined && role !== 'ADMIN'))) return res.status(409).json({ error: 'You cannot disable or demote your own account' });
  if (disabled !== undefined) u.disabled = disabled;
  if (role !== undefined) u.role = role;
  if (ver !== undefined) u.verified = ver;
  if (u.disabled) for (const [t, who] of store.tokens) if (who === u) store.tokens.delete(t); // a disabled user is signed out at once
  audit.record({ user: req.user.email, role: 'ADMIN', action: 'admin.user_update', fields: ['disabled', 'role', 'verified'].filter((k) => req.body[k] !== undefined), reason: userId(u) });
  res.json(userRow(u));
});

// ---------- content with approval ----------
router.get('/content/:type', requireAuth, (req, res) => {
  const c = state.content[req.params.type];
  if (!c || (!c.approved && req.user.role !== 'ADMIN')) return res.status(404).json({ error: 'Content not found' }); // apps only see approved content
  res.json({ ...c, simulated: true });
});

router.put('/content/:type', requireAuth, need('ADMIN'), (req, res) => {
  const { items, approved } = req.body || {};
  if (!Array.isArray(items) || !items.length || items.some((i) => typeof i !== 'string' || !i.trim())) return res.status(422).json({ error: 'items must be a non-empty list of texts' });
  if (approved !== undefined && typeof approved !== 'boolean') return res.status(422).json({ error: 'approved must be true or false' });
  const old = state.content[req.params.type];
  const next = { type: req.params.type, version: old ? old.version + 1 : 1, approved: approved === true, approved_by: approved === true ? req.user.email : null, items };
  state.content[req.params.type] = next; // a changed text is not approved until an admin says so
  audit.record({ user: req.user.email, role: 'ADMIN', action: 'content.update', reason: req.params.type + ' v' + next.version });
  res.json({ ...next, simulated: true });
});

// ---------- feedback and privacy ----------
router.post('/feedback', requireAuth, need('PATIENT', 'FAMILY'), (req, res) => {
  const { emergency_id, rating, comment } = req.body || {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(422).json({ error: 'rating must be a whole number from 1 to 5' });
  if (comment !== undefined && (typeof comment !== 'string' || comment.length > 500)) return res.status(422).json({ error: 'comment must be text of 500 characters or less' });
  const e = store.emergencies.get(emergency_id);
  if (!e) return res.status(404).json({ error: 'Emergency not found' });
  if (req.user.role === 'PATIENT' && req.user.patient_id !== e.patient_id) return res.status(403).json({ error: 'This is not your emergency' });
  if (req.user.role === 'FAMILY' && !linked(req.user).includes(e.patient_id)) return res.status(403).json({ error: 'You are not linked to this patient' });
  if (state.feedback.some((f) => f.emergency_id === emergency_id && f.by === req.user.email)) return res.status(409).json({ error: 'You already sent feedback for this emergency' });
  const row = { id: 'FB-' + ++state.counters.feedback, emergency_id, rating, ...(comment ? { comment } : {}), by: req.user.email, at: new Date().toISOString() };
  state.feedback.push(row);
  res.status(201).json({ id: row.id, simulated: true });
});

router.post('/privacy-requests', requireAuth, need('PATIENT', 'ADMIN'), (req, res) => {
  const { type, patient_id } = req.body || {};
  if (!PRIVACY_TYPES.includes(type)) return res.status(400).json({ error: 'type must be one of ' + PRIVACY_TYPES.join(', ') });
  const pid = req.user.role === 'PATIENT' ? req.user.patient_id : patient_id;
  if (!pid) return res.status(400).json({ error: 'patient_id is required' });
  if (req.user.role === 'PATIENT' && patient_id && patient_id !== pid) return res.status(403).json({ error: 'You can only ask about your own data' });
  if (!store.patients[pid]) return res.status(404).json({ error: 'Patient not found' });
  const row = { id: 'PR-' + ++state.counters.privacy, type, patient_id: pid, status: 'RECEIVED', at: new Date().toISOString() };
  state.privacy.push(row);
  audit.record({ user: req.user.email, role: req.user.role, action: 'privacy.' + type.toLowerCase() + '_request', patient_id: pid });
  res.status(202).json({ id: row.id, type, status: 'RECEIVED', simulated: true, note: 'Simulated: nothing is exported or deleted.' });
});

// ---------- WebSocket: what each role may receive (used by simulator.broadcast) ----------
// Patients and staff get every event as before. A relative gets only a plain status change for a linked patient.
// A verified volunteer gets only responder.alert (no identity). Anyone else gets nothing.
function filterFor(user, event) {
  if (!user || ['PATIENT', 'HOSPITAL_STAFF', 'ADMIN'].includes(user.role)) return event;
  const e = event.emergency_id && store.emergencies.get(event.emergency_id);
  const stamp = { emergency_id: event.emergency_id, state: event.state, timestamp: event.timestamp };
  if (user.role === 'FAMILY') {
    if (!e || e.state === 'EMERGENCY_DETECTED' || !linked(user).includes(e.patient_id) || /^(vitals|ambulance\.location)/.test(event.type)) return null;
    return { type: 'family.status', ...stamp, payload: {} };
  }
  if (user.role === 'RESPONDER' && verified(user) && event.type === 'emergency.sos_sent' && e) {
    return { type: 'responder.alert', ...stamp, payload: { alert_id: e.id, distance_m: distanceFor(e), type: e.type } };
  }
  return null;
}

module.exports = { router, reset, filterFor };
