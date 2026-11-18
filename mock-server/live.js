// REAL live stream: while an alert is open, the patient's phone sends its GPS position and (if a Bluetooth strap is connected) its
// real heart rate. The hospital portal shows them as "Live from patient phone". Nothing here is simulated; the ambulance still is.
// The patient controls it: location needs the location consent, heart rate needs the vitals consent, and "Stop sharing" ends it.
const express = require('express');
const store = require('./store');
const simulator = require('./simulator');
const { requireAuth } = require('./helpers');

const router = express.Router();
const OPEN = ['SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED'];
const MIN_GAP_MS = 900;   // at most about one update per second per alert
const TRAIL_MAX = 40;
const lastAt = new Map(); // emergency id -> time of the last accepted update

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Pure: decide what to keep from one update. Returns { code, body, event? }.
function accept(emergency, patient, body, now = Date.now()) {
  if (!OPEN.includes(emergency.state)) return { code: 409, body: { error: 'Emergency is not open' } };
  const consents = { ...(patient && patient.consents), ...(emergency.consents || {}) };
  const b = body || {};
  const lat = num(b.lat), lng = num(b.lng), acc = num(b.accuracy), hr = num(b.heart_rate);
  const hasLoc = lat !== null && lng !== null;
  if ((b.lat !== undefined || b.lng !== undefined) && (!hasLoc || lat < -90 || lat > 90 || lng < -180 || lng > 180)) return { code: 400, body: { error: 'lat and lng must be real coordinates' } };
  if (b.heart_rate !== undefined && (hr === null || hr < 20 || hr > 250)) return { code: 400, body: { error: 'heart_rate must be 20 to 250' } };
  if (!hasLoc && hr === null) return { code: 400, body: { error: 'Send a location or a heart_rate' } };
  const useLoc = hasLoc && Boolean(consents.location);
  const useHr = hr !== null && Boolean(consents.vitals);
  const accepted = { location: useLoc, heart_rate: useHr };
  if (!useLoc && !useHr) return { code: 200, body: { accepted, skipped: 'no_consent' } };
  if (now - (lastAt.get(emergency.id) || 0) < MIN_GAP_MS) return { code: 200, body: { accepted: { location: false, heart_rate: false }, skipped: 'too_fast' } };
  lastAt.set(emergency.id, now);
  const at = new Date(now).toISOString();
  const live = { ...(emergency.live || {}), sharing: true, updated_at: at };
  if (useLoc) { Object.assign(live, { lat, lng, ...(acc !== null && acc >= 0 ? { accuracy: Math.round(acc) } : {}), location_at: at });
    emergency.live_trail = [...(emergency.live_trail || []), { lat, lng, at }].slice(-TRAIL_MAX); }
  if (useHr) Object.assign(live, { heart_rate: Math.round(hr), hr_source: 'strap', hr_at: at });
  emergency.live = live;
  const payload = { patient_id: emergency.patient_id, sharing: true, updated_at: at, label: 'Live from patient phone', ...(useLoc ? { lat, lng, ...(live.accuracy !== undefined ? { accuracy: live.accuracy } : {}) } : {}), ...(useHr ? { heart_rate: live.heart_rate, hr_source: 'strap' } : {}) };
  return { code: 200, body: { accepted }, event: { type: 'live.update', emergency_id: emergency.id, state: emergency.state, timestamp: at, payload } };
}

function stop(emergency, now = Date.now()) {
  if (!emergency.live) return { code: 200, body: { sharing: false }, event: null };
  emergency.live = { ...emergency.live, sharing: false, stopped_at: new Date(now).toISOString() };
  const at = emergency.live.stopped_at;
  return { code: 200, body: { sharing: false }, event: { type: 'live.stopped', emergency_id: emergency.id, state: emergency.state, timestamp: at, payload: { patient_id: emergency.patient_id, sharing: false } } };
}

// Only the patient who owns this alert may stream into it.
function mine(req, res) {
  if (!req.user || req.user.role !== 'PATIENT') { res.status(403).json({ error: 'Only the patient can share live data' }); return null; }
  const e = store.emergencies.get(req.params.id);
  if (!e || e.patient_id !== req.user.patient_id) { res.status(404).json({ error: 'Emergency not found' }); return null; }
  return e;
}

router.post('/emergencies/:id/live', requireAuth, (req, res) => {
  const e = mine(req, res); if (!e) return;
  const r = accept(e, store.patients[e.patient_id], req.body);
  if (r.event) simulator.broadcast(r.event);
  res.status(r.code).json(r.body);
});

router.delete('/emergencies/:id/live', requireAuth, (req, res) => {
  const e = mine(req, res); if (!e) return;
  const r = stop(e);
  if (r.event) simulator.broadcast(r.event);
  res.status(r.code).json(r.body);
});

module.exports = { router, accept, stop, OPEN, MIN_GAP_MS, reset: () => lastAt.clear() };
