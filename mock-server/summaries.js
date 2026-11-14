// Phase 6: past alerts and the post-incident summary. It is a plain record of what the app did.
// It never interprets, never gives a cause and never says how things turned out for the person's health.
const express = require('express');
const store = require('./store');
const { requireAuth } = require('./helpers');

const router = express.Router();
const sec = (from, to) => (from && to ? Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000)) : null);
const stampOf = (e, state) => (e.status_events.find((s) => s.state === state) || {}).timestamp || null;

function summaryOf(e) {
  const started_at = e.status_events[0].timestamp;
  const last = e.status_events[e.status_events.length - 1];
  const finished = ['HANDOVER_DONE', 'CANCELLED'].includes(e.state);
  return {
    id: e.id, started_at, ended_at: finished ? last.timestamp : null, source: e.source || 'MANUAL', final_state: e.state, simulated: true,
    timeline: e.status_events.map((s) => ({ state: s.state, timestamp: s.timestamp })),
    // Seconds from the start of the alert (when it was detected), or null when that step did not happen.
    durations: {
      to_acknowledged: sec(started_at, stampOf(e, 'HOSPITAL_ACKNOWLEDGED')),
      to_dispatched: sec(started_at, stampOf(e, 'AMBULANCE_DISPATCHED')),
      to_arrived: sec(started_at, stampOf(e, 'ARRIVED')),
      to_handover: sec(started_at, stampOf(e, 'HANDOVER_DONE')),
    },
    shared: { location: !!e.consents.location, history: !!e.consents.history, vitals: !!e.consents.vitals, reports: !!e.consents.reports },
    symptoms: e.symptoms || [],
    vitals_at_alert: e.vitals_at_alert || {},
    contacts_notified: (e.contacts_notified || []).map((c) => ({ name: c.name })),
    hospital: e.hospital ? { name: e.hospital.name } : null,
    ambulance_id: e.ambulance ? e.ambulance.id : null,
  };
}

const mine = (req, res) => {
  if (!store.patients[req.params.id]) { res.status(404).json({ error: 'Patient not found' }); return null; }
  return [...store.emergencies.values()].filter((e) => e.patient_id === req.params.id);
};

// Newest first. The app shows the last 5.
router.get('/patients/:id/emergencies', requireAuth, (req, res) => {
  const list = mine(req, res);
  if (!list) return;
  res.json(list.reverse().slice(0, 20).map((e) => ({
    id: e.id, started_at: e.status_events[0].timestamp, final_state: e.state, type: e.type, source: e.source || 'MANUAL',
  })));
});

router.get('/patients/:id/emergencies/:eid/summary', requireAuth, (req, res) => {
  const list = mine(req, res);
  if (!list) return;
  const e = list.find((x) => x.id === req.params.eid);
  if (!e) return res.status(404).json({ error: 'Emergency not found' });
  res.json(summaryOf(e));
});

module.exports = router;
module.exports.summaryOf = summaryOf;
