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

const state = { profile: 'normal', overrides: {} };
let last = null;

const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
const profileName = (name) => (PROFILES[name] ? name : ALIASES[name] || null);

// One reading "now" for the active profile, with any pinned values applied.
function currentVitals() {
  const base = PROFILES[state.profile];
  const r = {};
  VITALS.forEach((k) => { r[k] = k in state.overrides ? state.overrides[k] : randomInt(base[k][0], base[k][1]); });
  r.bp = r.bp_sys + '/' + r.bp_dia;
  r.profile = state.profile;
  r.timestamp = new Date().toISOString();
  last = r;
  return r;
}

// Validates first and changes nothing when anything is wrong. Returns { status, body }.
function applyChange(body) {
  const known = ['patient_id', 'profile', 'overrides'];
  const extra = Object.keys(body || {}).filter((k) => !known.includes(k));
  if (!body || typeof body !== 'object' || extra.length) return { status: 422, body: { error: 'Unknown field: ' + (extra[0] || 'body') } };
  let wanted = state.profile;
  if (body.profile !== undefined) {
    wanted = profileName(body.profile);
    if (!wanted) return { status: 400, body: { error: 'Unknown profile. Use: ' + Object.keys(PROFILES).join(', ') } };
  }
  let next = { ...state.overrides };
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
  state.profile = wanted;
  state.overrides = next;
  return { status: 200, body: { profile: state.profile, overrides: { ...state.overrides }, reading: currentVitals(), simulated: true } };
}

const reset = () => { state.profile = 'normal'; state.overrides = {}; last = null; };
const snapshot = () => ({ profile: state.profile, overrides: { ...state.overrides }, profiles: Object.keys(PROFILES) });

module.exports = { currentVitals, applyChange, reset, snapshot, PROFILES, VITALS, LIMITS };
