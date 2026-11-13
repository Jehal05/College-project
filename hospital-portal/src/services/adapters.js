// ONE place that turns whatever the patient app (Jehal) and the backend (Daksh) send
// into the shape the portal screens use. Pure functions, no React, no network.
// Rule: the screens never look at raw backend data. If a name or shape changes, fix it HERE.
// Tests: adapters.test.js (one test per rule) and integration.test.js (a real event from Jehal's mock).

export const NOT_SHARED = 'Not shared';

// ---------- Symptoms: IDs -> readable words ----------
const SYMPTOM_WORDS = {
  CHEST_PAIN: 'Chest pain',
  SHORT_BREATH: 'Shortness of breath',
  SWEATING: 'Sweating',
  NAUSEA: 'Nausea',
  ARM_JAW_PAIN: 'Pain in arm or jaw',
  FAINTING: 'Fainting',
  FACE_DROOP: 'Face drooping',
  LIMB_WEAKNESS: 'Arm or leg weakness',
  SLURRED_SPEECH: 'Slurred speech',
  SUDDEN_CONFUSION: 'Sudden confusion',
  SEVERE_HEADACHE: 'Severe headache',
  DIA_CONFUSION: 'Confusion',
  DIA_SHAKING: 'Shaking',
  DIA_SWEATING: 'Sweating',
  DIA_FAINTING: 'Fainting',
  LOW_GLUCOSE_READING: 'Low glucose reading',
  WHEEZING: 'Wheezing',
  CANNOT_SPEAK_SENTENCES: 'Cannot speak full sentences',
  SEVERE_SHORT_BREATH: 'Severe shortness of breath',
  BLUE_LIPS: 'Blue lips',
};

/** "CHEST_PAIN" -> "Chest pain". Text that is already readable stays as it is. Unknown IDs are tidied up, never dropped. */
export function symptomLabel(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const known = SYMPTOM_WORDS[raw.toUpperCase().replace(/[\s-]+/g, '_')];
  if (known) return known;
  if (/[a-z]/.test(raw) && /\s/.test(raw)) return raw; // already a readable phrase, e.g. "Chest pain"
  const words = raw.toLowerCase().replace(/[_-]+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const symptomLabels = (list) => (Array.isArray(list) ? list.map(symptomLabel).filter(Boolean) : []);

// ---------- Login ----------
const ROLE_MAP = { HOSPITAL_STAFF: 'staff', STAFF: 'staff', HOSPITAL: 'staff', ADMIN: 'admin' };

/**
 * Daksh v0.6 answers { token, role, user_id, ... } with role HOSPITAL_STAFF | ADMIN | PATIENT and, today,
 * no hospital_id. The portal wants { token, role: 'staff' | 'admin', name, hospital_id | null }.
 * A patient account is refused: this portal is for hospital staff.
 */
export function normaliseLogin(res, typedName = '') {
  if (!res?.token) throw new Error('The server did not return a login token.');
  const role = ROLE_MAP[String(res.role || '').toUpperCase()];
  if (!role) throw new Error(String(res.role || '').toUpperCase() === 'PATIENT' ? 'This is a patient account. Use the patient app.' : 'This account cannot use the hospital portal.');
  const hospital_id = res.hospital_id ?? res.hospital?.id ?? null;
  return {
    token: res.token,
    role,
    name: res.name || res.username || typedName || res.user_id || 'Hospital staff',
    user_id: res.user_id ?? null,
    hospital_id: hospital_id === null ? null : String(hospital_id),
    hospital_from_login: hospital_id !== null,
  };
}

// ---------- Hospitals ----------
const CAPABILITY_ALIASES = {
  CARDIAC_CATH_LAB: 'cath_lab',
  CATH_LAB: 'cath_lab',
  STROKE_UNIT: 'stroke_unit',
  ICU: 'icu',
  EMERGENCY: 'emergency',
};

/** Capabilities as a list (['ICU','EMERGENCY']) or an object ({ icu: true }) -> { cath_lab, stroke_unit, icu, emergency, ...others }. */
export function normaliseCapabilities(caps) {
  const out = { cath_lab: false, stroke_unit: false, icu: false, emergency: false };
  const put = (name, on) => {
    const key = CAPABILITY_ALIASES[String(name).toUpperCase()] || String(name).toLowerCase();
    out[key] = Boolean(on);
  };
  if (Array.isArray(caps)) caps.forEach((c) => put(c, true));
  else if (caps && typeof caps === 'object') Object.entries(caps).forEach(([k, v]) => put(k, v));
  return out;
}

/**
 * Hospital from GET /hospitals (list style or object style) -> portal shape.
 * No availability object (Jehal's mock only has an `available` flag)? Bed counts stay null (shown as a dash)
 * and the unit-ready flags follow `available`. We never invent bed numbers.
 */
export function normaliseHospital(h) {
  if (!h || typeof h !== 'object') return null;
  const capabilities = normaliseCapabilities(h.capabilities);
  const given = h.availability && typeof h.availability === 'object' ? h.availability : null;
  const open = h.available !== false;
  // Our names (beds_free, icu_free, cath_lab_ready, stroke_unit_ready) and Daksh v0.6.1 names (icu_beds, cath_lab_open, stroke_unit_open) both work.
  const availability = given
    ? {
        beds_free: given.beds_free ?? null,
        icu_free: given.icu_free ?? given.icu_beds ?? null,
        cath_lab_ready: Boolean(given.cath_lab_ready ?? given.cath_lab_open),
        stroke_unit_ready: Boolean(given.stroke_unit_ready ?? given.stroke_unit_open),
        ...(given.ready === false ? { ready: false } : {}),
      }
    : { beds_free: null, icu_free: null, cath_lab_ready: open && capabilities.cath_lab, stroke_unit_ready: open && capabilities.stroke_unit, ...(open ? {} : { ready: false }) };
  return {
    ...h,
    id: String(h.id),
    name: h.name || String(h.id),
    lat: Number(h.lat),
    lng: Number(h.lng),
    verified: Boolean(h.verified),
    capabilities,
    availability,
  };
}

export const normaliseHospitals = (list) => (Array.isArray(list) ? list.map(normaliseHospital).filter(Boolean) : []);

/** The hospital this desk belongs to: the one from login, else the first verified one (the desk can change it). */
export function defaultHospitalId(hospitals, loginHospitalId) {
  if (loginHospitalId != null && hospitals.some((h) => h.id === String(loginHospitalId))) return String(loginHospitalId);
  return (hospitals.find((h) => h.verified) || hospitals[0] || {}).id ?? null;
}

// ---------- Locations and vitals ----------
export const isPoint = (p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)) && p?.lat !== null && p?.lng !== null;

/** Patient location from any of the shapes seen so far, or null. */
export function pickLocation(src = {}) {
  const l = src.location || src.patient_location || src.patient?.location;
  if (isPoint(l)) return { ...l, lat: Number(l.lat), lng: Number(l.lng) };
  if (isPoint(src)) return { lat: Number(src.lat), lng: Number(src.lng) };
  return null;
}

/** Centre of a list of hospitals. Used for map centre and travel times when a patient location was not shared. */
export function centroid(points) {
  const ok = (points || []).filter(isPoint);
  if (!ok.length) return null;
  return { lat: ok.reduce((s, p) => s + Number(p.lat), 0) / ok.length, lng: ok.reduce((s, p) => s + Number(p.lng), 0) / ok.length };
}

/** Where to measure from: the patient's location if shared, else the middle of the hospitals (marked approximate). */
export function originFor(emergency, hospitals) {
  const loc = pickLocation(emergency || {});
  if (loc) return { ...loc, approximate: false };
  const c = centroid(hospitals);
  return c ? { ...c, approximate: true } : null;
}

/** Vitals from payload.vitals, or from the rule inputs (reasons.inputs.vitals), as { heart_rate, spo2, bp, ... } or null. */
export function pickVitals(payload = {}) {
  const v = payload.vitals || payload.vitals_at_alert || payload.reasons?.inputs?.vitals;
  if (!v || typeof v !== 'object') return null;
  const out = { ...v };
  if (!out.bp && Number.isFinite(out.bp_sys) && Number.isFinite(out.bp_dia)) out.bp = `${out.bp_sys}/${out.bp_dia}`;
  return Object.keys(out).length ? out : null;
}

// ---------- Emergencies ----------
export const CHECK_IN_SOURCES = ['FALL_CHECK', 'INACTIVITY_CHECK'];
const SOURCE_WORDS = { FALL_CHECK: 'fall check', INACTIVITY_CHECK: 'inactivity check', MANUAL: 'the patient pressed the button' };

/** Started by the safety check-in (no symptoms, type UNKNOWN). */
export const isCheckIn = (e) => CHECK_IN_SOURCES.includes(e?.source) || (e?.type === 'UNKNOWN' && !(e?.symptoms || []).length);

/** One sentence for the screen about how the alert started. */
export function originText(e) {
  if (isCheckIn(e)) return `No symptoms reported. Started by the safety check-in (${SOURCE_WORDS[e.source] || 'check-in'}). Simulated.`;
  return null;
}

/**
 * Emergency (list item, detail or created payload) -> portal shape.
 * Missing patient, location or vitals become null; screens print NOT_SHARED. Nothing is invented,
 * except that a missing severity is treated as URGENT so an alert is never buried at the bottom of the queue.
 */
export function normaliseEmergency(src = {}) {
  const symptom_ids = Array.isArray(src.symptom_ids) ? src.symptom_ids : Array.isArray(src.symptoms) ? src.symptoms : [];
  const type = src.type || (symptom_ids.length ? null : 'UNKNOWN') || 'UNKNOWN';
  const patient = src.patient && typeof src.patient === 'object' ? src.patient : null;
  const timeline = src.status_events?.length ? src.status_events : src.timeline?.length ? src.timeline : null;
  const out = {
    ...src,
    emergency_id: src.emergency_id ?? src.id ?? null,
    type: type || 'UNKNOWN',
    source: src.source || 'MANUAL',
    severity: src.severity || 'URGENT',
    symptom_ids,
    symptoms: symptomLabels(symptom_ids),
    patient_id: src.patient_id ?? patient?.id ?? null,
    alerted_hospital_id: src.alerted_hospital_id ?? (src.hospital?.id != null ? String(src.hospital.id) : null) ?? undefined,
    ambulance_id: src.ambulance_id ?? src.ambulance?.id ?? undefined,
    patient,
    location: pickLocation(src),
    vitals: pickVitals(src),
    simulated: src.simulated !== false,
  };
  if (timeline) out.status_events = timeline.map((s) => ({ ...s }));
  delete out.id;
  if (out.alerted_hospital_id === undefined || out.alerted_hospital_id === null) delete out.alerted_hospital_id;
  if (out.ambulance_id === undefined) delete out.ambulance_id;
  if (src.ambulance && typeof src.ambulance !== 'object') delete out.ambulance;
  delete out.timeline;
  if (!timeline) delete out.status_events;
  return out;
}

export const normaliseEmergencies = (list) => (Array.isArray(list) ? list.map(normaliseEmergency) : []);

/** Text for a field that may be missing. */
export const orNotShared = (value) => (value === null || value === undefined || value === '' ? NOT_SHARED : value);

// ---------- Sample fleet (only when the backend has no GET /ambulances) ----------
/** Put each sample unit at one of the hospitals (verified ones first, round-robin), so routes are short and make sense. */
export function placeSampleFleet(units, hospitals) {
  const base = [...hospitals].sort((a, b) => Number(b.verified) - Number(a.verified));
  if (!base.length) return units;
  let i = 0;
  return units.map((u) => {
    if (!u.sample) return u;
    const h = base[i++ % base.length];
    return { ...u, base_hospital_id: h.id, lat: h.lat, lng: h.lng };
  });
}

// ---------- Ambulance movement (heading and progress are computed here, not sent) ----------
const toRad = (d) => (d * Math.PI) / 180;

/** Compass bearing in degrees (0 = north) from a to b. */
export function bearing(a, b) {
  const p1 = toRad(a.lat);
  const p2 = toRad(b.lat);
  const dl = toRad(b.lng - a.lng);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

/**
 * Merge a new ambulance.location payload into what we know. The backend may send only
 * { ambulance_id, lat, lng, eta_seconds }. We add:
 *   heading   from the last position to this one (kept when the ambulance did not move)
 *   progress  0..1 from how far the ETA has fallen since the first ETA we saw
 * Fields the backend does send (heading, progress, remaining_km, leg) always win.
 */
export function withMotion(previous, payload) {
  const next = { ...payload };
  const prev = previous || {};
  const hasPos = isPoint(next);
  const moved = hasPos && isPoint(prev) && (Number(prev.lat) !== Number(next.lat) || Number(prev.lng) !== Number(next.lng));
  if (!Number.isFinite(next.heading)) next.heading = moved ? bearing(prev, next) : Number.isFinite(prev.heading) ? prev.heading : 0;
  const eta = Number(next.eta_seconds);
  if (Number.isFinite(eta)) {
    const first = Number.isFinite(prev.first_eta_seconds) ? prev.first_eta_seconds : eta;
    next.first_eta_seconds = Math.max(first, eta);
    if (!Number.isFinite(next.progress)) next.progress = next.first_eta_seconds > 0 ? Math.max(0, Math.min(1, 1 - eta / next.first_eta_seconds)) : 0;
  }
  return next;
}

// ---------- WebSocket events ----------
/**
 * Any event envelope -> { event, emergency_id, state, timestamp, payload }, or null when it is not an event we can use.
 *   - the name may be in `event` or `type` (Jehal sends both)
 *   - hospital.alerted: `hospital_id` or `hospital: { id, name, distance_km }` -> hospital_id (+ hospital_name, distance_km)
 *   - hospital.acknowledged: acknowledged_by -> actor
 *   - emergency.created: payload goes through normaliseEmergency
 * IDs are kept exactly as sent; the portal never assumes an ID style.
 */
export function normaliseEvent(msg) {
  if (!msg || typeof msg !== 'object') return null;
  const event = typeof msg.event === 'string' ? msg.event : typeof msg.type === 'string' && msg.type.includes('.') ? msg.type : null;
  if (!event) return null;
  const raw = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
  const emergency_id = msg.emergency_id ?? raw.emergency_id ?? null;
  let payload = { ...raw };

  if (event === 'emergency.created') {
    payload = normaliseEmergency({ ...raw, emergency_id });
    delete payload.emergency_id;
  } else if (event === 'hospital.alerted') {
    const h = raw.hospital && typeof raw.hospital === 'object' ? raw.hospital : null;
    const id = raw.hospital_id ?? h?.id;
    if (id !== undefined && id !== null) payload.hospital_id = String(id);
    if (h?.name) payload.hospital_name = h.name;
    if (h?.distance_km !== undefined) payload.distance_km = h.distance_km;
    delete payload.hospital;
  } else if (event === 'hospital.acknowledged') {
    if (payload.hospital_id != null) payload.hospital_id = String(payload.hospital_id);
    if (!payload.actor && payload.acknowledged_by) payload.actor = payload.acknowledged_by;
  } else if (event === 'emergency.sos_sent') {
    // No payload needed: the state change is the news.
  }
  return { event, emergency_id, state: msg.state || null, timestamp: msg.timestamp || new Date().toISOString(), payload };
}
