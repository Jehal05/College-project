// HOSPITAL_MODE=manual: the hospital portal drives the emergency. The mock plays NO ack / dispatch / ambulance timers;
// it accepts the portal's REST calls instead. Default mode ("auto") keeps the old fake hospital timeline.
const express = require('express');
const store = require('./store');
const simulator = require('./simulator');
const { requireAuth, DEMO_LOCATION } = require('./helpers');

const mode = () => (process.env.HOSPITAL_MODE === 'manual' ? 'manual' : 'auto');
const STAFF = ['HOSPITAL_STAFF', 'ADMIN'];
// Who may move an emergency to which state, and from which states (Daksh's table, see API_CONTRACT.md).
const ALLOWED_FROM = {
  HOSPITAL_ACKNOWLEDGED: ['SOS_SENT'],
  AMBULANCE_DISPATCHED: ['SOS_SENT', 'HOSPITAL_ACKNOWLEDGED'],
  EN_ROUTE: ['AMBULANCE_DISPATCHED'],
  ARRIVED: ['EN_ROUTE', 'AMBULANCE_DISPATCHED'],
  HANDOVER_DONE: ['ARRIVED'],
};
const EVENT_FOR = { HOSPITAL_ACKNOWLEDGED: 'hospital.acknowledged', AMBULANCE_DISPATCHED: 'ambulance.dispatched', EN_ROUTE: 'ambulance.location',
  ARRIVED: 'emergency.arrived', HANDOVER_DONE: 'emergency.handover_done' };

// Pure: can this state change happen? Returns an error text or null.
function checkTransition(from, to) {
  if (!ALLOWED_FROM[to]) return 'Unknown state: ' + to;
  if (!ALLOWED_FROM[to].includes(from)) return 'Cannot move from ' + from + ' to ' + to;
  return null;
}

function staffOnly(req, res, next) {
  if (!STAFF.includes(req.user.role)) return res.status(403).json({ error: 'Hospital staff only' });
  next();
}

// Manual mode, after the portal dispatches: the mock moves the ambulance until the desk presses the next status button
// or the portal starts posting positions itself (emergency.portal_moves).
function startManualTicks(emergency, amb) {
  const from = store.hospitals.find((x) => x.id === amb.base_hospital_id) || amb;
  const where = emergency.location || DEMO_LOCATION;
  for (let n = 1; n <= 30; n += 1) {
    simulator.manualLater(emergency, n * 2000, () => {
      if (emergency.portal_moves || !['AMBULANCE_DISPATCHED', 'EN_ROUTE'].includes(emergency.state)) return;
      const progress = Math.min(1, n / 30); const eta = Math.round(60 * (1 - progress));
      simulator.manualEmit(emergency, 'ambulance.location', 'EN_ROUTE', { ambulance_id: amb.id, lat: from.lat + (where.lat - from.lat) * progress,
        lng: from.lng + (where.lng - from.lng) * progress, eta_seconds: eta, progress }, { eta_seconds: eta });
    });
  }
}

const router = express.Router();
const find = (req, res) => { const e = store.emergencies.get(req.params.id); if (!e) res.status(404).json({ error: 'Emergency not found' }); return e; };
const move = (e, to, payload, res) => {
  const bad = checkTransition(e.state, to);
  if (bad) return res.status(409).json({ error: 'Invalid transition', detail: 'Invalid transition', from: e.state, to });
  simulator.manualEmit(e, EVENT_FOR[to], to, payload);
  res.json({ id: e.id, state: e.state });
};

router.post('/emergencies/:id/ack', requireAuth, staffOnly, (req, res) => {
  const e = find(req, res); if (!e) return;
  move(e, 'HOSPITAL_ACKNOWLEDGED', { hospital_id: (req.body && req.body.hospital_id) || (e.hospital && e.hospital.id), acknowledged_by: req.user.email }, res);
});
router.post('/emergencies/:id/dispatch', requireAuth, staffOnly, (req, res) => {
  const e = find(req, res); if (!e) return;
  const amb = store.ambulances.find((a) => a.id === (req.body || {}).ambulance_id);
  if (!amb) return res.status(400).json({ error: 'ambulance_id must be one of ' + store.ambulances.map((a) => a.id).join(', ') });
  const bad = checkTransition(e.state, 'AMBULANCE_DISPATCHED');
  if (bad) return res.status(409).json({ error: 'Invalid transition', detail: 'Invalid transition', from: e.state, to: 'AMBULANCE_DISPATCHED' });
  amb.status = 'dispatched';
  e.ambulance = { id: amb.id, call_sign: amb.call_sign };
  move(e, 'AMBULANCE_DISPATCHED', { ambulance_id: amb.id }, res);
  startManualTicks(e, amb);
});
router.post('/emergencies/:id/status', requireAuth, staffOnly, (req, res) => {
  const e = find(req, res); if (!e) return;
  const to = (req.body || {}).state;
  if (to === 'EN_ROUTE') return move(e, to, { ambulance_id: e.ambulance && e.ambulance.id }, res);
  move(e, to, to === 'ARRIVED' ? { ambulance_id: e.ambulance && e.ambulance.id } : {}, res);
});
// The portal's lists: ?status=active (not finished or cancelled) or ?status=finished.
router.get('/emergencies', requireAuth, (req, res) => {
  const done = (e) => ['HANDOVER_DONE', 'CANCELLED'].includes(e.state);
  const want = req.query.status;
  const all = [...store.emergencies.values()].filter((e) => e.state !== 'EMERGENCY_DETECTED' || process.env.ALERT_AT === 'detected');
  const list = want === 'active' ? all.filter((e) => !done(e)) : want === 'finished' ? all.filter(done) : all;
  res.json(list.map((e) => ({ ...e, emergency_id: e.id, created_at: e.status_events[0].timestamp, simulated: true,
    ...(e.consents && e.consents.location && e.location ? {} : { location: undefined }) })));
});

router.get('/ambulances', requireAuth, (req, res) => res.json(store.ambulances));
// The portal's own simulator posts the ambulance position; the mock relays it as ambulance.location.
router.post('/ambulances/:id/location', requireAuth, (req, res) => {
  const amb = store.ambulances.find((a) => a.id === req.params.id);
  if (!amb) return res.status(404).json({ error: 'Ambulance not found' });
  const b = req.body || {};
  if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return res.status(400).json({ error: 'lat and lng are required numbers' });
  amb.lat = b.lat; amb.lng = b.lng;
  const e = store.emergencies.get(b.emergency_id);
  if (e) e.portal_moves = true; // the portal moves the ambulance itself: stop the mock's own ticks
  if (e) simulator.manualEmit(e, 'ambulance.location', e.state === 'AMBULANCE_DISPATCHED' ? 'EN_ROUTE' : e.state,
    { ambulance_id: amb.id, lat: b.lat, lng: b.lng, eta_seconds: b.eta_seconds, heading: b.heading, progress: b.progress, remaining_km: b.remaining_km }, { eta_seconds: b.eta_seconds });
  res.json({ ok: true });
});

module.exports = { router, mode, checkTransition };
