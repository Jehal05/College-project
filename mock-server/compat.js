// Compatibility layer for Daksh's backend contract (backend/CONTRACT.md v0.6). Everything that makes this mock also speak
// "his" names lives HERE, so the rest of the mock stays readable. It only ADDS: old names keep working for old clients.
// Added: `detail` next to `error`; username login; `event` next to `type`; `timeline` next to `status_events`;
// `consent` / lowercase symptoms / optional type on POST /emergencies; consent history; GET /passport/{id}?token=;
// POST /demo/scenario { scenario }; { status: "reset" }. Not covered: see docs/API_CONTRACT.md "Differences from Daksh's contract".
const store = require('./store');
const { SYMPTOM_TO_ENGINE } = require('./adapters');
const { evaluate } = require('./rules');

const ENGINE_TO_APP = {};
Object.entries(SYMPTOM_TO_ENGINE).forEach(([appId, engine]) => { if (engine && !ENGINE_TO_APP[engine]) ENGINE_TO_APP[engine] = appId; });
const USERNAMES = { patient1: 'patient@demo.test', staff1: 'staff@demo.test', admin1: 'admin@demo.test' };
const PORTAL_LOGINS = { 'staff@demo': { email: 'staff@demo.test', role: 'staff', hospital_id: 'HSP-AMD-002' },
  'admin@demo': { email: 'admin@demo.test', role: 'admin', hospital_id: 'HSP-AMD-002' } };
const CONSENT_KEYS = ['location', 'history', 'vitals', 'reports'];

// Wraps res.json so a later step can add fields to the answer.
function decorate(res, fn) {
  const send = res.json.bind(res);
  res.json = (body) => send(body && typeof body === 'object' && !Array.isArray(body) ? fn(body, res.statusCode) : body);
}

// One app symptom ID from either spelling (CHEST_PAIN, chest_pain, or a rules-engine name such as breathlessness).
const toAppSymptom = (name) => (ENGINE_TO_APP[String(name).toLowerCase()] || String(name).toUpperCase());

function middleware(req, res, next) {
  // Errors: Daksh uses { detail }, the app uses { error }. Send both.
  decorate(res, (body, status) => (status >= 400 && typeof body.error === 'string' && !('detail' in body) ? { ...body, detail: body.error } : body));

  if (req.method === 'POST' && req.path === '/auth/login' && req.body) {
    const b = req.body;
    if (b.username && !b.email) b.email = USERNAMES[b.username] || b.username;
    if (b.password === 'demo-password') b.password = 'demo1234';
    // The hospital portal's own demo logins (staff@demo / admin@demo, password demo123) get lowercase roles and a hospital_id.
    if (PORTAL_LOGINS[b.email] && b.password === 'demo123') {
      const portal = PORTAL_LOGINS[b.email]; b.email = portal.email; b.password = 'demo1234';
      decorate(res, (body) => (body.token ? { ...body, role: portal.role, hospital_id: portal.hospital_id } : body));
    }
    decorate(res, (body) => (body.token ? { ...body, user_id: 'usr_' + (store.users.findIndex((u) => u.patient_id === body.patient_id && u.role === body.role) + 1 || 1).toString().padStart(3, '0') } : body));
  }

  if (req.method === 'POST' && req.path === '/emergencies' && req.body) {
    const b = req.body;
    if (b.consent && !b.consents) b.consents = b.consent;
    const asked = Array.isArray(b.symptoms) ? b.symptoms : null;
    if (asked && b.type !== 'UNKNOWN') {
      if (!b.type) { // type is optional in Daksh's contract: the rules engine decides it
        const result = evaluate(asked.map(toAppSymptom), {});
        if (result.type) b.type = result.type;
      }
      b.symptoms = asked.map(toAppSymptom);
    }
    decorate(res, (body, status) => (status === 201 ? { ...body, patient_id: b.patient_id, type: b.type, simulated: true, created_at: new Date().toISOString(),
      ...ruleSummary(store.emergencies.get(body.id)) } : body));
  }

  if (req.method === 'GET' && /^\/emergencies\/[^/]+$/.test(req.path)) {
    decorate(res, (body) => (Array.isArray(body.status_events) ? { ...body, simulated: true, timeline: timeline(body.status_events) } : body));
  }

  if (req.method === 'POST' && req.path === '/demo/scenario' && req.body && req.body.scenario && !req.body.type) req.body.type = req.body.scenario;
  if (req.method === 'POST' && req.path === '/demo/reset') decorate(res, (body) => ({ ...body, status: 'reset' }));

  const consentPath = /^\/patients\/([^/]+)\/consents$/.exec(req.path);
  if (consentPath && store.patients[consentPath[1]]) {
    const pid = consentPath[1];
    if (req.method === 'PUT' && req.body) { // send only the flags you want to change
      const before = { ...store.patients[pid].consents };
      req.body = { ...before, ...req.body };
      decorate(res, (body) => ({ ...body, changed: CONSENT_KEYS.filter((k) => body.consents && body.consents[k] !== before[k]) }));
    }
    decorate(res, (body) => ({ patient_id: pid, simulated: true, ...body }));
  }

  // Daksh's passport call: GET /passport/{patient_id}?token=...  (401 expired or unknown, 403 other patient)
  const passport = /^\/passport\/([^/]+)$/.exec(req.path);
  if (req.method === 'GET' && passport && req.query.token) {
    const p = store.passportTokens.get(String(req.query.token));
    if (!p || p.revoked || Date.parse(p.expires_at) <= Date.now()) return res.status(401).json({ error: 'Token expired or invalid' });
    if (p.patient_id !== passport[1]) return res.status(403).json({ error: 'Token belongs to another patient' });
    req.url = '/passport/' + p.token;
    decorate(res, (body) => ({ patient_id: p.patient_id, shared_fields: CONSENT_KEYS.filter((k) => store.patients[p.patient_id].consents[k]), simulated: true, ...body }));
  }
  next();
}

const timeline = (events) => events.map((e) => ({ state: e.state, timestamp: e.timestamp, actor: 'system',
  seconds_since_start: Math.round((Date.parse(e.timestamp) - Date.parse(events[0].timestamp)) / 1000) }));
const ruleSummary = (e) => (e && e.reasons ? { reasons: e.reasons.matched_rules.map((r) => r.reason), rule_ids: e.reasons.matched_rules.map((r) => r.id),
  action: { EMERGENCY: 'alert_hospital_now', URGENT: 'prompt_symptom_check', WATCH: 'log_only' }[e.reasons.severity] || 'no_action' } : {});

// GET /patients/:id/consents/history (append-only list of changes, oldest first)
const express = require('express');
const { requireAuth } = require('./helpers');
const router = express.Router();
router.get('/patients/:id/consents/history', requireAuth, (req, res) => {
  if (!store.patients[req.params.id]) return res.status(404).json({ error: 'Patient not found' });
  const history = [...(store.consentChanges[req.params.id] || [])].reverse()
    .map((c) => ({ field: c.key, granted: c.value, timestamp: c.timestamp, actor: req.user.patient_id || 'usr_001', actor_role: req.user.role }));
  res.json({ patient_id: req.params.id, history, simulated: true });
});

module.exports = { middleware, router };
