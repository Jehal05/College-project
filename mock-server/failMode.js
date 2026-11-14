// Test helper (never needed in normal use): makes the mock server misbehave on purpose so the app's
// error handling can be checked. POST /demo/fail { "mode": "off" | "server" | "expired" | "slow" }
//   server  -> every request answers 500        expired -> every logged-in request answers 401
//   slow    -> every request except emergencies waits 12 s (the app gives up after 10 s)
const express = require('express');
const { requireAuth } = require('./helpers');

let mode = 'off';
const MODES = ['off', 'server', 'expired', 'slow'];
const exempt = (req) => req.path === '/health' || req.path.startsWith('/demo') || req.path === '/auth/login';

function middleware(req, res, next) {
  if (mode === 'off' || exempt(req)) return next();
  if (mode === 'server') return res.status(500).json({ error: 'Simulated server error' });
  if (mode === 'expired' && req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
  if (mode === 'slow' && !req.path.startsWith('/emergencies')) return setTimeout(next, 12000);
  return next();
}

const router = express.Router();
router.post('/demo/fail', requireAuth, (req, res) => {
  const wanted = req.body && req.body.mode;
  if (!MODES.includes(wanted)) return res.status(400).json({ error: 'mode must be ' + MODES.join(', ') });
  mode = wanted;
  res.json({ mode });
});

module.exports = { middleware, router, reset: () => { mode = 'off'; } };
