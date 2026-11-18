// Simulated wearable. Profiles and per-vital overrides follow Daksh's CONTRACT.md (section 4.1, POST /demo/vitals).
// Everything here is FAKE data. The "bp" string stays for older consumers; bp_sys and bp_dia are added next to it.
const PROFILES = {
  normal:       { heart_rate: [70, 76],   spo2: [97, 99], bp_sys: [118, 122], bp_dia: [78, 82],   glucose: [102, 108], resp_rate: [15, 17] },
  heart_attack: { heart_rate: [135, 150], spo2: [93, 95], bp_sys: [158, 164], bp_dia: [98, 102],  glucose: [115, 125], resp_rate: [21, 23] },
  stroke:       { heart_rate: [85, 95],   spo2: [96, 97], bp_sys: [192, 198], bp_dia: [108, 112], glucose: [125, 135], resp_rate: [17, 19] },
  low_glucose:  { heart_rate: [105, 115], spo2: [97, 98], bp_sys: [108, 112], bp_dia: [68, 72],   glucose: [48, 56],   resp_rate: [17, 19] },
  asthma:       { heart_rate: [110, 120], spo2: [88, 91], bp_sys: [128, 132], bp_dia: [83, 87],   glucose: [108, 112], resp_rate: [27, 30] },
};
const ALIASES = { HEART: 'heart_attack', STROKE: 'stroke', DIABETIC: 'low_glucose', ASTHMA: 'asthma' };
const LIMITS = { heart_rate: [20, 250], spo2: [50, 100], bp_sys: [60, 260], bp_dia: [30, 160], glucose: [20, 600], resp_rate: [4, 60] };
const VITALS = Object.keys(LIMITS);

const state = { profile: 'normal', overrides: {} }; // the default: every patient without a profile of their own
const perPatient = new Map();                       // patient id -> { profile, overrides } (Heart emergency for ONE patient)
let last = null;
const stateFor = (patientId) => (patientId && perPatient.get(patientId)) || state;

const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
const profileName = (name) => (PROFILES[name] ? name : ALIASES[name] || null);

// One reading "now" for the active profile, with any pinned values applied.
function currentVitals(patientId) {
  const st = stateFor(patientId);
  const base = PROFILES[st.profile];
  const r = {};
  VITALS.forEach((k) => { r[k] = k in st.overrides ? st.overrides[k] : randomInt(base[k][0], base[k][1]); });
  r.bp = r.bp_sys + '/' + r.bp_dia;
  r.profile = st.profile;
  r.timestamp = new Date().toISOString();
  last = r;
  return r;
}

// Validates first and changes nothing when anything is wrong. Returns { status, body }.
// With a patient_id the change applies to that patient only (unknown patients are refused); without one it changes the default.
function applyChange(body, knownPatient = () => true) {
  const known = ['patient_id', 'profile', 'overrides'];
  const extra = Object.keys(body || {}).filter((k) => !known.includes(k));
  if (!body || typeof body !== 'object' || extra.length) return { status: 422, body: { error: 'Unknown field: ' + (extra[0] || 'body') } };
  const pid = body && body.patient_id;
  if (pid !== undefined && (typeof pid !== 'string' || !knownPatient(pid))) return { status: 404, body: { error: 'Patient not found' } };
  const target = stateFor(pid);
  let wanted = target.profile;
  if (body.profile !== undefined) {
    wanted = profileName(body.profile);
    if (!wanted) return { status: 400, body: { error: 'Unknown profile. Use: ' + Object.keys(PROFILES).join(', ') } };
  }
  let next = { ...target.overrides };
  if (body.overrides !== undefined) {
    const o = body.overrides;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return { status: 400, body: { error: 'overrides must be an object' } };
    if (!Object.keys(o).length) next = {};
    for (const [k, v] of Object.entries(o)) {
      if (!VITALS.includes(k)) return { status: 400, body: { error: 'Unknown vital: ' + k } };
      if (v === null) { delete next[k]; continue; }
      if (typeof v !== 'number' || !Number.isFinite(v) || v < LIMITS[k][0] || v > LIMITS[k][1]) {
        return { status: 400, body: { error: k + ' must be a number from ' + LIMITS[k][0] + ' to ' + LIMITS[k][1] } };
      }
      next[k] = v;
    }
  }
  if (pid !== undefined) perPatient.set(pid, { profile: wanted, overrides: next });
  else { state.profile = wanted; state.overrides = next; }
  const now = stateFor(pid);
  return { status: 200, body: { ...(pid !== undefined ? { patient_id: pid } : {}), profile: now.profile, overrides: { ...now.overrides }, reading: currentVitals(pid), simulated: true } };
}

const reset = () => { state.profile = 'normal'; state.overrides = {}; perPatient.clear(); last = null; };
const snapshot = () => ({ profile: state.profile, overrides: { ...state.overrides }, profiles: Object.keys(PROFILES), patients: Object.fromEntries([...perPatient].map(([id, s]) => [id, s.profile])) });
const profileOf = (patientId) => stateFor(patientId).profile;


// The readings the rules engine and the summary use. Only when the patient shares vitals.
const VITAL_KEYS = ['heart_rate', 'spo2', 'bp_sys', 'bp_dia', 'glucose', 'resp_rate'];
function sharedVitals(consents, patientId) {
  if (consents && consents.vitals === false) return null;
  const reading = currentVitals(patientId);
  return { ...Object.fromEntries(VITAL_KEYS.map((k) => [k, reading[k]])), timestamp: reading.timestamp };
}

module.exports = { profileOf, sharedVitals, VITAL_KEYS, currentVitals, applyChange, reset, snapshot, PROFILES, VITALS, LIMITS };
