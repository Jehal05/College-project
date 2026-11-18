// REAL phone alerts for the demo, free tools only. When someone presses SOS, the team's own phones get a real message at each step.
//   ntfy.sh   free push app, no account (pick a long secret topic name)
//   Telegram  free bot, no limit that matters here
//   Twilio    real SMS, optional, trial account sends only to numbers you verified yourself
// Who gets it: ONLY the team phones listed in live.config.json (at most 2 per channel). Patient contacts in the data are fictional and are never messaged.
// Every message starts with a DEMO label. Real ambulances, hospitals and 112/108 are never contacted.
// Secrets and numbers live only in mock-server/live.config.json or in environment variables. They are never logged, stored or sent to the apps.
const fs = require('fs');
const path = require('path');
const store = require('./store');
const persist = require('./persist');

const CONFIG_FILE = path.join(__dirname, 'live.config.json');
const MAX_PER_CHANNEL = 2;      // me and Jehal
const MAX_PER_MINUTE = 20;      // protects the free Twilio trial and the chats from a loop
const LABEL = 'HEALTHTWIN DEMO (fictional patient, nobody is really hurt, do NOT call 112)';

let config = {};
let fetchFn = (...a) => fetch(...a);
const sentKeys = new Set();
let windowStart = 0, windowCount = 0;

const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim()).filter(Boolean).slice(0, MAX_PER_CHANNEL);

function readConfig() {
  let file = {};
  try { file = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (e) { /* no file: environment only */ }
  const env = process.env;
  const c = {
    public_url: env.PUBLIC_URL || file.public_url || '',
    ntfy: { server: env.NTFY_SERVER || (file.ntfy && file.ntfy.server) || 'https://ntfy.sh', topic: env.NTFY_TOPIC || (file.ntfy && file.ntfy.topic) || '' },
    telegram: { bot_token: env.TELEGRAM_BOT_TOKEN || (file.telegram && file.telegram.bot_token) || '', chat_ids: list(env.TELEGRAM_CHAT_IDS || (file.telegram && file.telegram.chat_ids)) },
    twilio: { account_sid: env.TWILIO_ACCOUNT_SID || (file.twilio && file.twilio.account_sid) || '', auth_token: env.TWILIO_AUTH_TOKEN || (file.twilio && file.twilio.auth_token) || '',
      from: env.TWILIO_FROM || (file.twilio && file.twilio.from) || '', to: list(env.TWILIO_TO || (file.twilio && file.twilio.to)) },
  };
  if (c.ntfy.topic && c.ntfy.topic.length < 12) c.ntfy.topic = ''; // a short topic name is guessable by strangers: refuse it
  return c;
}

const channels = () => ({
  ntfy: Boolean(config.ntfy && config.ntfy.topic),
  telegram: Boolean(config.telegram && config.telegram.bot_token && config.telegram.chat_ids.length),
  sms: Boolean(config.twilio && config.twilio.account_sid && config.twilio.auth_token && config.twilio.from && config.twilio.to.length),
});

function init(override) { config = override || readConfig(); return channels(); }
function setFetch(fn) { fetchFn = fn; }
function reset() { sentKeys.clear(); windowStart = 0; windowCount = 0; }

function describe() {
  const c = channels();
  const on = Object.keys(c).filter((k) => c[k]);
  return on.length ? 'Real phone alerts ON: ' + on.join(', ') + ' (team phones only, every message labelled DEMO)'
    : 'Real phone alerts OFF (no live.config.json). Fill it in to get real messages: see docs/GO_LIVE.md';
}

async function post(url, opts) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try { const r = await fetchFn(url, { ...opts, signal: ctl.signal }); return { ok: r.ok, status: r.status }; }
  catch (e) { return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : 'network' }; }
  finally { clearTimeout(t); }
}

// Send one message on every channel that is set up. Returns [{channel, ok}] and never throws.
async function send({ title, text, priority, emergencyId, link }) {
  const now = Date.now();
  if (now - windowStart > 60000) { windowStart = now; windowCount = 0; }
  if (windowCount >= MAX_PER_MINUTE) return [{ channel: 'all', ok: false, detail: 'rate limit' }];
  windowCount += 1;
  const body = LABEL + '\n' + text;
  const jobs = [];
  const c = channels();
  if (c.ntfy) {
    const ascii = (v) => String(v).replace(/[^\x20-\x7e]/g, '?'); // HTTP header values must be plain ASCII
    const headers = { Title: ascii(title), Priority: String(priority || 4), Tags: 'rotating_light' };
    if (link) headers.Click = ascii(link);
    jobs.push(post(config.ntfy.server.replace(/\/$/, '') + '/' + encodeURIComponent(config.ntfy.topic), { method: 'POST', headers, body }).then((r) => ({ channel: 'ntfy', ...r })));
  }
  if (c.telegram) {
    for (const chat of config.telegram.chat_ids) {
      jobs.push(post('https://api.telegram.org/bot' + config.telegram.bot_token + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: title + '\n' + body + (link ? '\n' + link : '') }) }).then((r) => ({ channel: 'telegram', ...r })));
    }
  }
  if (c.sms) {
    const tw = config.twilio;
    const auth = Buffer.from(tw.account_sid + ':' + tw.auth_token).toString('base64');
    for (const to of tw.to) {
      jobs.push(post('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(tw.account_sid) + '/Messages.json', { method: 'POST',
        headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: to, From: tw.from, Body: (title + ' - ' + body).slice(0, 320) }).toString() }).then((r) => ({ channel: 'sms', ...r })));
    }
  }
  const results = await Promise.all(jobs);
  for (const r of results) persist.logNotification(emergencyId, r.channel, r.ok, r.ok ? 'sent' : 'failed ' + (r.status || r.error || ''));
  return results;
}

const TYPE_LABEL = { HEART: 'Heart or chest', STROKE: 'Stroke signs', DIABETIC: 'Diabetic emergency', ASTHMA: 'Asthma or breathing', ACCIDENT: 'Accident or bleeding', SEIZURE: 'Seizure', ALLERGIC: 'Severe allergic reaction', POISONING: 'Poisoning', BURN: 'Burns', PREGNANCY: 'Pregnancy or childbirth' };

// What each step says. Names are the fictional demo patient only; no phone numbers, no address, no medical history.
function messageFor(event) {
  const e = store.emergencies.get(event.emergency_id);
  if (!e) return null;
  const patient = store.patients[e.patient_id] || {};
  const who = patient.name || 'A demo patient';
  const kind = TYPE_LABEL[e.type] || e.type || 'emergency';
  const hosp = (e.hospital && e.hospital.name) || 'the nearest hospital';
  const base = { emergencyId: e.id, link: config.public_url ? config.public_url.replace(/\/$/, '') + '/portal/' : undefined };
  switch (event.type) {
    case 'emergency.sos_sent': return { ...base, title: 'SOS: ' + who, priority: 5, text: who + ' pressed SOS (' + kind + '). Simulated alert sent to ' + hosp + '. ' + e.id };
    case 'hospital.acknowledged': return { ...base, title: 'Hospital acknowledged', priority: 3, text: hosp + ' (simulated) acknowledged the alert for ' + who + '.' };
    case 'ambulance.dispatched': return { ...base, title: 'Ambulance dispatched', priority: 4, text: 'A SIMULATED ambulance is on the way to ' + who + '. No real ambulance was called.' };
    case 'emergency.arrived': return { ...base, title: 'Ambulance arrived', priority: 3, text: 'The simulated ambulance reached ' + who + '.' };
    case 'emergency.cancelled': return { ...base, title: 'Alert cancelled', priority: 3, text: 'The alert for ' + who + ' was cancelled.' };
    default: return null;
  }
}

// Called for every broadcast event (simulator.js). Fire and forget: a slow phone service must never slow the emergency.
function onEvent(event) {
  try {
    if (!event || !event.emergency_id || !Object.values(channels()).some(Boolean)) return;
    const key = event.emergency_id + ':' + event.type;
    if (sentKeys.has(key)) return;
    const msg = messageFor(event);
    if (!msg) return;
    sentKeys.add(key);
    send(msg).then((r) => { const bad = r.filter((x) => !x.ok).length; if (bad) console.warn('Phone alert: ' + bad + ' of ' + r.length + ' failed (' + event.type + ')'); }).catch(() => {});
  } catch (e) { /* never break the emergency */ }
}

function testMessage() {
  return send({ title: 'Test message', priority: 3, text: 'This is a test from the HealthTwin demo. If you can read this, real phone alerts work.' });
}

module.exports = { init, setFetch, reset, describe, channels, send, onEvent, messageFor, testMessage, LABEL, MAX_PER_CHANNEL };
