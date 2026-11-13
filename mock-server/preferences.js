// Phase 6: small per-patient settings kept on the server (never in browser storage).
// Today only the safety check-in: { enabled, minutes } with minutes 5, 15 or 30. OFF by default.
const express = require('express');
const store = require('./store');
const { requireAuth } = require('./helpers');

const router = express.Router();
const MINUTES = [5, 15, 30];

router.get('/patients/:id/preferences', requireAuth, (req, res) => {
  if (!store.patients[req.params.id]) return res.status(404).json({ error: 'Patient not found' });
  res.json(store.preferences[req.params.id]);
});

router.put('/patients/:id/preferences', requireAuth, (req, res) => {
  if (!store.patients[req.params.id]) return res.status(404).json({ error: 'Patient not found' });
  const c = req.body && req.body.safety_checkin;
  if (!c || typeof c.enabled !== 'boolean' || !MINUTES.includes(c.minutes)) {
    return res.status(400).json({ error: 'safety_checkin needs enabled (true or false) and minutes (' + MINUTES.join(', ') + ')' });
  }
  store.preferences[req.params.id] = { safety_checkin: { enabled: c.enabled, minutes: c.minutes } };
  res.json(store.preferences[req.params.id]);
});

module.exports = router;
