// REAL data saving: the demo data is kept in a SQLite file, so alerts, passports, consents and the event log survive a restart.
// Uses Node's built-in `node:sqlite` (Node 22.5 or newer, no extra package). If it is not available the server still runs, in memory only.
// The file lives on this computer only and is git-ignored. Everything inside is fake demo data (plus the one-time passport links).
const path = require('path');
const store = require('./store');

const COLLECTIONS = ['patients', 'baselines', 'reports', 'consentChanges', 'counters', 'passports', 'accessLog', 'reminders', 'reminderLog', 'preferences'];
const DEFAULT_FILE = path.join(__dirname, 'data', 'healthtwin.db');

let db = null;
let timer = null;
let lastSaved = {};
let file = null;

const replacer = (k, v) => (v && v.type === 'Buffer' && Array.isArray(v.data) ? { __b64: Buffer.from(v.data).toString('base64') } : v);
const reviver = (k, v) => (v && typeof v === 'object' && typeof v.__b64 === 'string' ? Buffer.from(v.__b64, 'base64') : v);

function sqlite() {
  try {
    const orig = process.emitWarning;
    process.emitWarning = (w, ...a) => (/SQLite/.test(String(w)) ? undefined : orig.call(process, w, ...a)); // the experimental notice is not news
    try { return require('node:sqlite'); } finally { process.emitWarning = orig; }
  } catch (e) { return null; }
}

function open(dbFile) {
  const mod = sqlite();
  if (!mod) return false;
  file = dbFile || process.env.DB_FILE || DEFAULT_FILE;
  db = new mod.DatabaseSync(file);
  db.exec(`CREATE TABLE IF NOT EXISTS kv (name TEXT PRIMARY KEY, json TEXT NOT NULL, saved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS emergencies (id TEXT PRIMARY KEY, patient_id TEXT, type TEXT, state TEXT, created_at TEXT, json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, emergency_id TEXT, type TEXT, state TEXT, json TEXT);
    CREATE TABLE IF NOT EXISTS notifications (seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, emergency_id TEXT, channel TEXT, ok INTEGER, detail TEXT);`);
  return true;
}

const replaceInPlace = (target, value) => {
  if (Array.isArray(target)) { target.length = 0; target.push(...value); } else { for (const k of Object.keys(target)) delete target[k]; Object.assign(target, value); }
};

// Read the file into the in-memory store. Returns a short summary (used in the start-up log and the tests).
function load() {
  if (!db) return { loaded: false };
  const rows = Object.fromEntries(db.prepare('SELECT name, json FROM kv').all().map((r) => [r.name, r.json]));
  let restored = 0;
  for (const name of COLLECTIONS) {
    if (!rows[name]) continue;
    replaceInPlace(store[name], JSON.parse(rows[name], reviver));
    restored += 1;
  }
  if (rows.passportTokens) { store.passportTokens.clear(); for (const [t, p] of JSON.parse(rows.passportTokens)) { const cur = store.passports[p.patient_id]; store.passportTokens.set(t, cur && cur.created_at === p.created_at ? cur : p); } }
  if (rows.emergencyCounter) store.setEmergencyCounter(JSON.parse(rows.emergencyCounter));
  if (rows.availability) JSON.parse(rows.availability).forEach((a, i) => { if (store.hospitals[i]) store.hospitals[i].availability = a; });
  let interrupted = 0;
  store.emergencies.clear();
  for (const r of db.prepare('SELECT json FROM emergencies ORDER BY created_at').all()) {
    const e = JSON.parse(r.json, reviver);
    // The timeline timers do not survive a restart. An alert that was still open is closed honestly instead of hanging for ever.
    if (!['HANDOVER_DONE', 'CANCELLED'].includes(e.state)) {
      e.state = 'CANCELLED'; e.interrupted_by_restart = true;
      e.status_events = [...(e.status_events || []), { state: 'CANCELLED', timestamp: new Date().toISOString() }];
      interrupted += 1;
    }
    store.emergencies.set(e.id, e);
  }
  lastSaved = {};
  return { loaded: true, collections: restored, emergencies: store.emergencies.size, interrupted, file };
}

// Write what changed since the last save. Cheap at demo size: each collection is compared as text.
function save() {
  if (!db) return 0;
  const now = new Date().toISOString();
  const put = db.prepare('INSERT INTO kv (name, json, saved_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET json = excluded.json, saved_at = excluded.saved_at');
  let changed = 0;
  const parts = {};
  for (const name of COLLECTIONS) parts[name] = JSON.stringify(store[name], replacer);
  parts.passportTokens = JSON.stringify([...store.passportTokens.entries()]);
  parts.emergencyCounter = JSON.stringify(store.emergencyCounterValue());
  parts.availability = JSON.stringify(store.availability());
  db.exec('BEGIN');
  try {
    for (const [name, json] of Object.entries(parts)) {
      if (lastSaved[name] === json) continue;
      put.run(name, json, now); lastSaved[name] = json; changed += 1;
    }
    const upsert = db.prepare('INSERT INTO emergencies (id, patient_id, type, state, created_at, json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state, json = excluded.json');
    for (const e of store.emergencies.values()) {
      const json = JSON.stringify(e, replacer);
      if (lastSaved['em:' + e.id] === json) continue;
      upsert.run(e.id, e.patient_id || null, e.type || null, e.state || null, (e.status_events && e.status_events[0] && e.status_events[0].timestamp) || now, json);
      lastSaved['em:' + e.id] = json; changed += 1;
    }
    db.exec('COMMIT');
  } catch (err) { db.exec('ROLLBACK'); throw err; }
  return changed;
}

// Append-only log of every emergency event (not the once-a-second vitals).
function logEvent(event) {
  if (!db || !event || event.type === 'vitals.update') return;
  try { db.prepare('INSERT INTO events (ts, emergency_id, type, state, json) VALUES (?, ?, ?, ?, ?)').run(event.timestamp || new Date().toISOString(), event.emergency_id || null, event.type, event.state || null, JSON.stringify(event.payload || {})); } catch (e) { /* logging must never break an emergency */ }
}
function logNotification(emergencyId, channel, ok, detail) {
  if (!db) return;
  try { db.prepare('INSERT INTO notifications (ts, emergency_id, channel, ok, detail) VALUES (?, ?, ?, ?, ?)').run(new Date().toISOString(), emergencyId || null, channel, ok ? 1 : 0, String(detail || '').slice(0, 300)); } catch (e) { /* ignore */ }
}

function wipe() { // Reset demo: forget everything that was saved
  if (!db) return;
  db.exec('DELETE FROM kv; DELETE FROM emergencies; DELETE FROM events; DELETE FROM notifications;');
  lastSaved = {};
}

function summary() {
  if (!db) return { enabled: false };
  const n = (t) => db.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n;
  return { enabled: true, engine: 'SQLite (node:sqlite)', file_name: path.basename(file), emergencies: n('emergencies'), events: n('events'), notifications: n('notifications') };
}

function start(dbFile, everyMs = 3000) {
  if (/^(0|off|false|no)$/i.test(process.env.PERSIST || '')) return { enabled: false, reason: 'PERSIST=off' };
  try {
    if (!open(dbFile)) return { enabled: false, reason: 'node:sqlite needs Node 22.5 or newer' };
    const info = load();
    timer = setInterval(() => { try { save(); } catch (e) { console.warn('Saving failed:', e.message); } }, everyMs);
    if (timer.unref) timer.unref();
    const flush = () => { try { save(); } catch (e) { /* ignore */ } process.exit(0); };
    process.once('SIGINT', flush); process.once('SIGTERM', flush);
    return { enabled: true, ...info };
  } catch (e) { return { enabled: false, reason: e.message }; }
}

function close() { if (timer) clearInterval(timer); timer = null; if (db) { try { save(); } catch (e) { /* ignore */ } db.close(); } db = null; lastSaved = {}; }

module.exports = { open, load, save, start, close, logEvent, logNotification, wipe, summary, COLLECTIONS };
