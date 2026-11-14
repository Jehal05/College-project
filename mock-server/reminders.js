// Phase 6: medication reminders. Medicine names are health data, so they live here on the server, not in the browser.
// The app only REMINDS while it is open. It never suggests doses and never says what to do about a missed dose.
// IDs: M-<n>. Times are "HH:MM" on the person's own device clock; days are 0 (Sunday) to 6 (Saturday).
const express = require('express');
const store = require('./store');
const { requireAuth } = require('./helpers');

const router = express.Router();
const MAX_REMINDERS = 8;
const MAX_TIMES = 4;
const DAY_MS = 24 * 3600 * 1000;

const patientOf = (req, res) => {
  const p = store.patients[req.params.id];
  if (!p) res.status(404).json({ error: 'Patient not found' });
  return p;
};
const listOf = (id) => store.reminders[id] || (store.reminders[id] = []);
const logOf = (id) => store.reminderLog[id] || (store.reminderLog[id] = []);

// Returns an error text for a bad reminder body, or null.
function check(b) {
  if (!b || typeof b.name !== 'string' || !b.name.trim()) return 'name is required';
  if (b.name.trim().length > 60) return 'name can be at most 60 characters';
  if (b.dose_note !== undefined && (typeof b.dose_note !== 'string' || b.dose_note.length > 60)) return 'dose_note can be at most 60 characters';
  if (!Array.isArray(b.times) || !b.times.length || b.times.length > MAX_TIMES) return 'times must be a list of 1 to ' + MAX_TIMES + ' times';
  if (!b.times.every((t) => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t))) return 'each time must look like 08:30';
  if (new Set(b.times).size !== b.times.length) return 'times must not repeat';
  if (!Array.isArray(b.days) || !b.days.length || !b.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) || new Set(b.days).size !== b.days.length) {
    return 'days must be a list of different numbers from 0 (Sunday) to 6 (Saturday)';
  }
  if (b.paused !== undefined && typeof b.paused !== 'boolean') return 'paused must be true or false';
  return null;
}
const clean = (b, id) => ({
  id, name: b.name.trim(), dose_note: (b.dose_note || '').trim(), times: [...b.times].sort(), days: [...b.days].sort(), paused: !!b.paused,
});

router.get('/patients/:id/reminders', requireAuth, (req, res) => { if (patientOf(req, res)) res.json(listOf(req.params.id)); });

router.post('/patients/:id/reminders', requireAuth, (req, res) => {
  if (!patientOf(req, res)) return;
  const list = listOf(req.params.id);
  if (list.length >= MAX_REMINDERS) return res.status(409).json({ error: 'You can have at most ' + MAX_REMINDERS + ' reminders' });
  const problem = check(req.body);
  if (problem) return res.status(400).json({ error: problem });
  store.counters.reminder += 1;
  const reminder = clean(req.body, 'M-' + store.counters.reminder);
  list.push(reminder);
  res.status(201).json(reminder);
});

router.put('/patients/:id/reminders/:rid', requireAuth, (req, res) => {
  if (!patientOf(req, res)) return;
  const list = listOf(req.params.id);
  const at = list.findIndex((r) => r.id === req.params.rid);
  if (at < 0) return res.status(404).json({ error: 'Reminder not found' });
  const problem = check(req.body);
  if (problem) return res.status(400).json({ error: problem });
  list[at] = clean(req.body, req.params.rid);
  res.json(list[at]);
});

router.delete('/patients/:id/reminders/:rid', requireAuth, (req, res) => {
  if (!patientOf(req, res)) return;
  const list = listOf(req.params.id);
  const at = list.findIndex((r) => r.id === req.params.rid);
  if (at < 0) return res.status(404).json({ error: 'Reminder not found' });
  list.splice(at, 1);
  store.reminderLog[req.params.id] = logOf(req.params.id).filter((e) => e.reminder_id !== req.params.rid);
  res.json({ ok: true });
});

// The app records that a reminder was shown ("shown") and, later, that it was marked taken.
// A shown reminder with taken_at null is simply a record of a dose not marked as taken. The app gives no advice about it.
function entryFor(req, res) {
  if (!patientOf(req, res)) return null;
  if (!listOf(req.params.id).some((r) => r.id === req.params.rid)) { res.status(404).json({ error: 'Reminder not found' }); return null; }
  const when = new Date(req.body && req.body.scheduled_for);
  if (!req.body || Number.isNaN(when.getTime())) { res.status(400).json({ error: 'scheduled_for must be a date and time' }); return null; }
  const log = logOf(req.params.id);
  const scheduled_for = when.toISOString();
  let entry = log.find((e) => e.reminder_id === req.params.rid && e.scheduled_for === scheduled_for);
  if (!entry) { entry = { reminder_id: req.params.rid, scheduled_for, taken_at: null }; log.push(entry); }
  return entry;
}

router.post('/patients/:id/reminders/:rid/shown', requireAuth, (req, res) => {
  const entry = entryFor(req, res);
  if (entry) res.status(201).json(entry);
});

router.post('/patients/:id/reminders/:rid/taken', requireAuth, (req, res) => {
  const entry = entryFor(req, res);
  if (!entry) return;
  const at = new Date(req.body.at);
  if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'at must be a date and time' });
  entry.taken_at = at.toISOString();
  res.json(entry);
});

router.get('/patients/:id/reminders/log', requireAuth, (req, res) => {
  if (!patientOf(req, res)) return;
  const since = Date.now() - 7 * DAY_MS;
  res.json(logOf(req.params.id).filter((e) => Date.parse(e.scheduled_for) >= since)
    .sort((a, b) => b.scheduled_for.localeCompare(a.scheduled_for)));
});

module.exports = router;
