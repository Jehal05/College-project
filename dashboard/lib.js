// Pure data-handling helpers. No DOM, no network. Tested in test.mjs.
// Every shape here was read from the real backend (backend/CONTRACT.md and live responses).

export const MAIN_STATES = [
  "EMERGENCY_DETECTED", "SOS_SENT", "HOSPITAL_ACKNOWLEDGED",
  "AMBULANCE_DISPATCHED", "EN_ROUTE", "ARRIVED", "HANDOVER_DONE",
];
export const FINAL_STATES = ["HANDOVER_DONE", "CANCELLED"];
export const SEVERITIES = ["NONE", "WATCH", "URGENT", "EMERGENCY"];

/** Where an emergency is on the main path: { step, total, pct, tag } */
export function progress(state) {
  const i = MAIN_STATES.indexOf(state);
  if (i >= 0) return { step: i + 1, total: MAIN_STATES.length, pct: Math.round(((i + 1) / MAIN_STATES.length) * 100), tag: null };
  if (state === "ESCALATED") return { step: 2, total: MAIN_STATES.length, pct: Math.round((2 / MAIN_STATES.length) * 100), tag: "ESCALATED" };
  if (state === "CANCELLED") return { step: 0, total: MAIN_STATES.length, pct: 0, tag: "CANCELLED" };
  return { step: 0, total: MAIN_STATES.length, pct: 0, tag: state || null };
}

export const isActive = e => !!e && !FINAL_STATES.includes(e.state);

/** Backend timestamps look like 2026-11-16T12:15:31Z. A timestamp with no zone is treated as UTC. */
export function parseTime(ts) {
  if (!ts) return null;
  const s = /(Z|[+-]\d\d:?\d\d)$/.test(ts) ? ts : ts + "Z";
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export function elapsed(ts, now = Date.now()) {
  const t = parseTime(ts);
  if (t == null) return "-";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 90) return s + " s";
  if (s < 5400) return Math.round(s / 60) + " min";
  return Math.round(s / 3600) + " h";
}

export function mmss(totalSeconds) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "-";
  const s = Math.max(0, Math.round(totalSeconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/** Response times from the emergency's own timeline (seconds_since_start). Missing steps stay null. */
export function responseTimes(emergency) {
  const at = {};
  for (const t of (emergency && emergency.timeline) || []) if (!(t.state in at)) at[t.state] = t.seconds_since_start;
  const from = (a, b) => (a in at && b in at ? at[b] - at[a] : null);
  const last = ((emergency && emergency.timeline) || []).slice(-1)[0];
  return {
    toAck: from("SOS_SENT", "HOSPITAL_ACKNOWLEDGED"),
    toDispatch: from("SOS_SENT", "AMBULANCE_DISPATCHED"),
    toArrive: from("SOS_SENT", "ARRIVED"),
    total: last ? last.seconds_since_start : null,
  };
}

/** Average of the numbers that exist; null when there are none. */
export function average(values) {
  const v = values.filter(x => typeof x === "number" && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Counts for the top tiles, all taken from the emergency list and hospital list. */
export function tiles(emergencies, hospitals) {
  const list = emergencies || [];
  const active = list.filter(isActive);
  return {
    active: active.length,
    critical: active.filter(e => e.severity === "EMERGENCY").length,
    enRoute: list.filter(e => e.state === "EN_ROUTE" || e.state === "AMBULANCE_DISPATCHED").length,
    hospitalsFree: (hospitals || []).filter(h => h.availability && h.availability.beds_free > 0).length,
  };
}

// ---- vitals vs the patient's own usual range ----
export const VITAL_KEYS = [
  { key: "heart_rate", label: "Heart rate", unit: "bpm", base: "heart_rate" },
  { key: "spo2", label: "SpO2", unit: "%", base: "spo2" },
  { key: "bp_sys", label: "BP systolic", unit: "mmHg", base: "bp_systolic" },
  { key: "glucose", label: "Glucose", unit: "mg/dL", base: "glucose" },
  { key: "resp_rate", label: "Breathing", unit: "/min", base: null },
];

/** "below" / "within" / "above" the patient's own usual range, or "unknown". Display only, never a diagnosis. */
export function vsBaseline(value, range) {
  if (typeof value !== "number" || !range || typeof range.min !== "number" || typeof range.max !== "number") return "unknown";
  if (value < range.min) return "below";
  if (value > range.max) return "above";
  return "within";
}

/** Keep the last `max` points (a point every 3 s, so 20 points = 60 s). */
export function pushWindow(arr, value, max = 20) {
  const next = arr.concat([value]);
  return next.length > max ? next.slice(next.length - max) : next;
}

// ---- hospitals: why one ranks above another ----
const NEEDS = {
  HEART: [["cath_lab", "cath_lab_ready", "cath lab"]],
  STROKE: [["stroke_unit", "stroke_unit_ready", "stroke unit"]],
  ASTHMA: [["icu", null, "ICU"], ["emergency", null, "emergency department"]],
  DIABETIC: [["emergency", null, "emergency department"]],
  FALL: [["emergency", null, "emergency department"]],
};

/** Plain reasons built only from fields the API returned. */
export function whyRanked(hospital, type) {
  const needs = NEEDS[type] || [["emergency", null, "emergency department"]];
  const caps = hospital.capabilities || {};
  const av = hospital.availability || {};
  const out = [];
  for (const [cap, ready, label] of needs) {
    if (!caps[cap]) out.push({ ok: false, text: "No " + label });
    else if (ready && av[ready] === false) out.push({ ok: false, text: label + " not ready right now" });
    else out.push({ ok: true, text: "Has " + label + (ready && av[ready] ? " (ready)" : "") });
  }
  if (typeof hospital.distance_km === "number") out.push({ ok: null, text: hospital.distance_km.toFixed(1) + " km away" });
  if (typeof av.beds_free === "number") out.push({ ok: av.beds_free > 0, text: av.beds_free + " beds free" });
  return out;
}

// ---- map projection: lat/lng -> x/y inside a box ----
export function makeProjector(points, width, height, pad = 36) {
  const pts = points.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!pts.length) return () => ({ x: width / 2, y: height / 2 });
  let minLat = Math.min(...pts.map(p => p.lat)), maxLat = Math.max(...pts.map(p => p.lat));
  let minLng = Math.min(...pts.map(p => p.lng)), maxLng = Math.max(...pts.map(p => p.lng));
  if (maxLat - minLat < 0.004) { minLat -= 0.002; maxLat += 0.002; }
  if (maxLng - minLng < 0.004) { minLng -= 0.002; maxLng += 0.002; }
  const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);       // keep distances roughly true
  const spanX = (maxLng - minLng) * cosLat, spanY = maxLat - minLat;
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const offX = (width - spanX * scale) / 2, offY = (height - spanY * scale) / 2;
  return p => ({ x: offX + (p.lng - minLng) * cosLat * scale, y: height - (offY + (p.lat - minLat) * scale) });
}

// ---- audit ----
export function auditRows(body) {
  if (Array.isArray(body)) return body;
  return (body && (body.rows || body.items)) || [];
}

function csvCell(v) {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function auditCsv(rows) {
  const cols = ["timestamp", "role", "user_id", "action", "resource_type", "resource_id", "patient_id", "outcome", "reason", "fields_released"];
  return [cols.join(",")].concat(rows.map(r => cols.map(c => csvCell(r[c])).join(","))).join("\n");
}

export const list = d => (Array.isArray(d) ? d : (d && (d.items || d.rows || d.results)) || []);
