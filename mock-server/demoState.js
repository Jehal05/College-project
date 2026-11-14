// Demo speed (timers started after a change use the new value) and the demo state endpoints.
const express = require('express');
const { requireAuth } = require('./helpers');
const vitals = require('./vitals');
const escalation = require('./escalation');

const ALLOWED = [1, 2, 5, 10, 20];
const START = Number(process.env.DEMO_SPEED) || 1; // /demo/reset goes back to this
let speed = START;

const router = express.Router();
router.get('/demo/state', requireAuth, (req, res) => res.json({ speed, allowed_speeds: ALLOWED, vitals: vitals.snapshot() }));
router.post('/demo/speed', requireAuth, (req, res) => {
  const m = req.body && req.body.multiplier;
  if (!ALLOWED.includes(m)) return res.status(400).json({ error: 'multiplier must be one of ' + ALLOWED.join(', ') });
  speed = m;
  res.json({ speed });
});
// Test helper: the fake hospital stays silent so the alert escalates. { enabled: true, escalate_after_seconds: 5 } (nominal seconds, divided by speed).
router.post('/demo/no-ack', requireAuth, (req, res) => {
  escalation.configure(req.body || {});
  res.json({ no_ack: escalation.noAck() });
});
router.post('/demo/vitals', requireAuth, (req, res) => {
  const { status, body } = vitals.applyChange(req.body);
  res.status(status).json(body);
});

module.exports = { router, getSpeed: () => speed, reset: () => { speed = START; vitals.reset(); escalation.reset(); } };
