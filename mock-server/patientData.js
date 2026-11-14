// Phase 3 endpoints: consents, emergency contacts, reports (file upload) and the personal baseline.
// All data is fake and kept in memory. IDs: contacts C-<n>, reports R-<n>.
const express = require('express');
const store = require('./store');
const { requireAuth } = require('./helpers');

const router = express.Router();
const CONSENT_KEYS = ['location', 'history', 'vitals', 'reports'];
const RELATIONS = ['Mother', 'Father', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'];
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_CONTACTS = 5;
const MAX_REPORTS = 10;

// Find the patient or answer 404.
function patientOf(req, res) {
  const patient = store.patients[req.params.id];
  if (!patient) res.status(404).json({ error: 'Patient not found' });
  return patient;
}

// ---- Consents ----
const consentAnswer = (id) => ({ consents: store.patients[id].consents, changes: store.consentChanges[id] || [] });

router.get('/patients/:id/consents', requireAuth, (req, res) => {
  if (patientOf(req, res)) res.json(consentAnswer(req.params.id));
});

router.put('/patients/:id/consents', requireAuth, (req, res) => {
  const patient = patientOf(req, res);
  if (!patient) return;
  const body = req.body || {};
  if (!CONSENT_KEYS.every((k) => typeof body[k] === 'boolean')) {
    return res.status(400).json({ error: 'location, history, vitals and reports must all be true or false' });
  }
  const log = store.consentChanges[patient.id] || (store.consentChanges[patient.id] = []);
  const timestamp = new Date().toISOString();
  CONSENT_KEYS.filter((k) => patient.consents[k] !== body[k]).forEach((k) => log.unshift({ key: k, value: body[k], timestamp }));
  log.splice(20); // keep only the last 20 changes, newest first
  patient.consents = Object.fromEntries(CONSENT_KEYS.map((k) => [k, body[k]]));
  res.json(consentAnswer(patient.id));
});

// ---- Contacts ----
// Returns an error text for a bad contact body, or null. Phone: optional +, then 8 to 15 digits.
function checkContact(b) {
  if (!b || typeof b.name !== 'string' || !b.name.trim()) return 'name is required';
  if (!RELATIONS.includes(b.relation)) return 'relation must be one of: ' + RELATIONS.join(', ');
  if (typeof b.phone !== 'string' || !/^\+?\d{8,15}$/.test(b.phone.replace(/[\s-]/g, ''))) return 'phone is not valid';
  return null;
}

// Make sure exactly one contact is primary (when there is at least one).
function fixPrimary(list, preferredId) {
  if (!list.length) return;
  const keep = list.find((c) => c.id === preferredId) || list.find((c) => c.is_primary) || list[0];
  list.forEach((c) => { c.is_primary = c === keep; });
}

router.get('/patients/:id/contacts', requireAuth, (req, res) => {
  const patient = patientOf(req, res);
  if (patient) res.json(patient.contacts);
});

router.post('/patients/:id/contacts', requireAuth, (req, res) => {
  const patient = patientOf(req, res);
  if (!patient) return;
  const problem = checkContact(req.body);
  if (problem) return res.status(400).json({ error: problem });
  if (patient.contacts.length >= MAX_CONTACTS) return res.status(409).json({ error: 'You can save at most 5 contacts' });
  store.counters.contact += 1;
  const { name, relation, phone, is_primary } = req.body;
  const contact = { id: 'C-' + store.counters.contact, name: name.trim(), relation, phone: phone.trim(), is_primary: false };
  patient.contacts.push(contact);
  fixPrimary(patient.contacts, is_primary ? contact.id : null);
  res.status(201).json(contact);
});

router.put('/patients/:id/contacts/:contactId', requireAuth, (req, res) => {
  const patient = patientOf(req, res);
  if (!patient) return;
  const contact = patient.contacts.find((c) => c.id === req.params.contactId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const problem = checkContact(req.body);
  if (problem) return res.status(400).json({ error: problem });
  Object.assign(contact, { name: req.body.name.trim(), relation: req.body.relation, phone: req.body.phone.trim() });
  fixPrimary(patient.contacts, req.body.is_primary ? contact.id : null);
  res.json(contact);
});

router.delete('/patients/:id/contacts/:contactId', requireAuth, (req, res) => {
  const patient = patientOf(req, res);
  if (!patient) return;
  const index = patient.contacts.findIndex((c) => c.id === req.params.contactId);
  if (index < 0) return res.status(404).json({ error: 'Contact not found' });
  patient.contacts.splice(index, 1);
  fixPrimary(patient.contacts, null); // if the primary was deleted, the first one becomes primary
  res.status(204).end();
});

// ---- Reports (raw file body, kept in memory) ----
// Reject a wrong type BEFORE reading the body, so a big wrong file is not even read.
function checkFileType(req, res, next) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim();
  if (!FILE_TYPES.includes(type)) return res.status(415).json({ error: 'Only PDF, JPG and PNG files are allowed' });
  next();
}
const readFile = express.raw({ type: FILE_TYPES, limit: '2mb' });
const reportInfo = ({ data, ...info }) => info; // never send the bytes in lists

router.get('/patients/:id/reports', requireAuth, (req, res) => {
  if (patientOf(req, res)) res.json((store.reports[req.params.id] || []).map(reportInfo));
});

router.post('/patients/:id/reports', requireAuth, checkFileType, readFile, (req, res) => {
  const patient = patientOf(req, res);
  if (!patient) return;
  const list = store.reports[patient.id] || (store.reports[patient.id] = []);
  if (list.length >= MAX_REPORTS) return res.status(409).json({ error: 'You can keep at most 10 reports' });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'The file is empty' });
  store.counters.report += 1;
  const name = String(req.query.name || 'report').replace(/[^A-Za-z0-9 .\-_]/g, '').trim().slice(0, 80) || 'report';
  const report = { id: 'R-' + store.counters.report, name, content_type: req.headers['content-type'].split(';')[0].trim(),
    size: req.body.length, uploaded_at: new Date().toISOString(), data: req.body };
  list.push(report);
  res.status(201).json(reportInfo(report));
});

router.get('/patients/:id/reports/:reportId/file', requireAuth, (req, res) => {
  if (!patientOf(req, res)) return;
  const report = (store.reports[req.params.id] || []).find((r) => r.id === req.params.reportId);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.set('Content-Type', report.content_type).send(report.data);
});

router.delete('/patients/:id/reports/:reportId', requireAuth, (req, res) => {
  if (!patientOf(req, res)) return;
  const list = store.reports[req.params.id] || [];
  const index = list.findIndex((r) => r.id === req.params.reportId);
  if (index < 0) return res.status(404).json({ error: 'Report not found' });
  list.splice(index, 1);
  res.status(204).end();
});

// ---- Baseline used by the digital twin bar ----
router.get('/patients/:id/baseline', requireAuth, (req, res) => {
  if (patientOf(req, res)) res.json(store.baseline);
});

// Turn body-size and other parser errors into JSON answers (413 when a report is over 2 MB).
router.use((err, req, res, next) => {
  if (err && err.status) return res.status(err.status).json({ error: err.type === 'entity.too.large' ? 'File is larger than 2 MB' : 'Bad request' });
  next(err);
});

module.exports = router;
