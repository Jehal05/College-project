// Phase 9 (Puneet's list): PATCH /hospitals/:id/availability, the hospital view with both key names, and GET /audit.
const express = require('express');
const store = require('./store');
const simulator = require('./simulator');
const audit = require('./audit');
const { requireAuth, distanceKm, DEMO_LOCATION } = require('./helpers');

const router = express.Router();
// Stored names are the portal's. Daksh's v0.6.1 names are accepted and shown next to them (decision 3.2 in DECISIONS_MEETING.md).
const COUNT = { beds_free: 'beds_free', icu_free: 'icu_free', icu_beds: 'icu_free' };
const FLAG = { cath_lab_ready: 'cath_lab_ready', cath_lab_open: 'cath_lab_ready', stroke_unit_ready: 'stroke_unit_ready', stroke_unit_open: 'stroke_unit_ready' };

const withAliases = (a) => ({ ...a, icu_beds: a.icu_free, cath_lab_open: a.cath_lab_ready, stroke_unit_open: a.stroke_unit_ready });
function hospitalView(h, lat = DEMO_LOCATION.lat, lng = DEMO_LOCATION.lng) {
  return { ...h, availability: withAliases(h.availability), distance_km: Number(distanceKm(lat, lng, h.lat, h.lng).toFixed(2)) };
}

// Pure: turns the request body into a clean update, or an error text.
function parseAvailability(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) return { error: 'Send an availability object, for example { "beds_free": 10 }' };
  const out = {};
  for (const [key, value] of Object.entries(body)) {
    const name = COUNT[key] || FLAG[key];
    if (!name) return { error: 'Unknown availability field: ' + key + '. Allowed: ' + [...Object.keys(COUNT), ...Object.keys(FLAG)].join(', ') };
    if (COUNT[key] && !(Number.isInteger(value) && value >= 0)) return { error: key + ' must be a whole number, 0 or more' };
    if (FLAG[key] && typeof value !== 'boolean') return { error: key + ' must be true or false' };
    if (name in out && out[name] !== value) return { error: 'Two names for the same field disagree: ' + key };
    out[name] = value;
  }
  return { update: out };
}

router.patch('/hospitals/:id/availability', requireAuth, (req, res) => {
  const { role, hospital_id: mine, email } = req.user;
  if (!['HOSPITAL_STAFF', 'ADMIN'].includes(role)) return res.status(403).json({ error: 'Hospital staff only' });
  const h = store.hospitals.find((x) => x.id === req.params.id);
  if (!h) return res.status(404).json({ error: 'Hospital not found' });
  const denied = role === 'HOSPITAL_STAFF' && mine && mine !== h.id;
  const { error, update } = denied ? {} : parseAvailability(req.body);
  if (denied) { audit.record({ user: email, role, action: 'hospital.availability_update', outcome: 'denied', reason: 'other_hospital', fields: [] }); return res.status(403).json({ error: 'Staff can only update their own hospital' }); }
  if (error) return res.status(400).json({ error });
  h.availability = { ...h.availability, ...update };
  audit.record({ user: email, role, action: 'hospital.availability_update', fields: Object.keys(update) });
  simulator.broadcast({ type: 'hospital.availability_updated', emergency_id: null, state: 'MONITORING', timestamp: new Date().toISOString(),
    payload: { hospital_id: h.id, availability: withAliases(h.availability) } });
  res.json(hospitalView(h));
});

router.get('/audit', requireAuth, (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only an admin can read the audit log' });
  const pageNo = Math.max(1, parseInt(req.query.page, 10) || 1);
  const size = Math.min(200, Math.max(1, parseInt(req.query.page_size, 10) || 50));
  res.json(audit.page(pageNo, size));
});

module.exports = router;
module.exports.hospitalView = hospitalView;
module.exports.parseAvailability = parseAvailability;
