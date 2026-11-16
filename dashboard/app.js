import * as L from "./lib.js";

// ---- the only place a URL lives ----
const DEFAULT_BASE = "http://localhost:8000";
const POLL_FAST = 3000;      // when the live socket is down
const POLL_SLOW = 10000;     // when the live socket is up

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

const S = {
  base: DEFAULT_BASE, token: null, me: null,
  emergencies: [], hospitals: [], ambulances: [], hospitalsFor: null,
  sel: null, live: false, ws: null, wsTimer: null, pollTimer: null, tickTimer: null,
  vitals: { win: {}, last: null, baseline: null, err: null },
  detail: null, audit: null, consents: null, demo: null,
  events: [], flashIds: new Set(), refreshSoon: null, mapKey: "", proj: null, driving: false, resetArmed: false,
};
const role = () => (S.me && S.me.role) || "";
const isStaff = () => role() === "HOSPITAL_STAFF" || role() === "ADMIN";

// ---- network ----
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (S.token) headers.Authorization = "Bearer " + S.token;
  const r = await fetch(S.base + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let body = null; try { body = await r.json(); } catch (e) {}
  if (!r.ok) { const e = new Error((body && (body.detail || body.error)) || "HTTP " + r.status); e.status = r.status; throw e; }
  return body;
}
const safe = async fn => { try { return { ok: true, data: await fn() }; } catch (e) { return { ok: false, err: e }; } };

// ---- theme ----
if (store.get("ht_theme")) document.documentElement.dataset.theme = store.get("ht_theme");
$("btnTheme").onclick = () => {
  const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next; store.set("ht_theme", next);
};

// ---- login ----
$("inBase").value = store.get("ht_base") || DEFAULT_BASE;
$("btnGo").onclick = login;
for (const id of ["inUser", "inPass", "inBase"]) $(id).addEventListener("keydown", e => { if (e.key === "Enter") login(); });
async function login() {
  S.base = $("inBase").value.trim().replace(/\/$/, ""); store.set("ht_base", S.base);
  $("loginMsg").textContent = "Logging in...";
  try {
    const u = $("inUser").value.trim();
    const d = await api("/auth/login", { method: "POST", body: { login: u, password: $("inPass").value } });
    S.token = d.token; S.me = d;
    start();
  } catch (e) {
    $("loginMsg").innerHTML = '<span class="err">Could not log in: ' + esc(e.message) + "</span>" +
      (e.status ? "" : '<br>Is the backend running at ' + esc(S.base) + ' and does it allow this page\'s address? See README (CORS_ALLOW_ORIGINS).');
  }
}
$("btnOut").onclick = () => {
  stop(); S.token = null; S.me = null; $("app").hidden = true; $("login").hidden = false;
  $("btnOut").hidden = true; $("chRole").hidden = true; setLive(false, "offline");
};

function start() {
  $("login").hidden = true; $("app").hidden = false; $("btnOut").hidden = false;
  $("chRole").hidden = false; $("chRole").textContent = role().replace("_", " ").toLowerCase() + (S.me.name ? ": " + S.me.name : "");
  S.vitals = { win: {}, last: null, baseline: null, err: null }; S.events = []; S.sel = null;
  $("privTitle").textContent = role() === "PATIENT" ? "Privacy" : "Consent and audit";
  connectWS(); refreshAll(); schedulePoll();
  S.tickTimer = setInterval(renderClockBits, 1000);
}
function stop() {
  clearTimeout(S.pollTimer); clearInterval(S.tickTimer); clearTimeout(S.wsTimer);
  if (S.ws) { S.ws.onclose = null; S.ws.close(); S.ws = null; }
}
function schedulePoll() { clearTimeout(S.pollTimer); S.pollTimer = setTimeout(async () => { await refreshAll(); schedulePoll(); }, S.live ? POLL_SLOW : POLL_FAST); }

function setLive(on, text) { S.live = on; const c = $("chLive"); c.textContent = text; c.className = "chip " + (on ? "ok" : "bad"); }

// ---- live socket ----
function connectWS() {
  clearTimeout(S.wsTimer);
  let ws;
  try { ws = new WebSocket(S.base.replace(/^http/, "ws") + "/ws?token=" + encodeURIComponent(S.token)); } catch (e) { setLive(false, "polling every 3 s"); return; }
  S.ws = ws;
  ws.onopen = () => setLive(true, "live");
  ws.onclose = () => { setLive(false, "polling every 3 s"); if (S.token) S.wsTimer = setTimeout(connectWS, 4000); };
  ws.onerror = () => {};
  ws.onmessage = m => {
    let ev; try { ev = JSON.parse(m.data); } catch (e) { return; }
    onEvent(ev);
  };
}
function onEvent(ev) {
  const name = ev.event || ev.type || "event";
  if (name === "auth.ok") return;
  S.events.unshift({ name, id: ev.emergency_id, state: ev.state, at: ev.timestamp || new Date().toISOString(), fresh: true });
  S.events = S.events.slice(0, 25);
  if (ev.emergency_id && /^(emergency\.created|hospital\.alerted)$/.test(name)) S.flashIds.add(ev.emergency_id);
  if (name === "vitals.update" && ev.payload) pushVitals(ev.payload);
  renderEvents();
  clearTimeout(S.refreshSoon); S.refreshSoon = setTimeout(refreshAll, 250);   // re-read the truth from the API
}

// ---- data loading ----
async function refreshAll() {
  const jobs = [loadHealth(), loadEmergencies(), loadHospitals(), loadAmbulances(), loadVitals(), loadPrivacy(), loadDemo()];
  await Promise.all(jobs);
  renderAll();
}
async function loadHealth() {
  const r = await safe(() => api("/health")); const c = $("chHealth");
  const ok = r.ok && String(r.data.status).toLowerCase() === "ok";
  c.textContent = "system: " + (ok ? "OK" : r.ok ? String(r.data.status) : "unreachable"); c.className = "chip " + (ok ? "ok" : "bad");
}
async function loadEmergencies() {
  const path = role() === "PATIENT" ? "/patients/" + encodeURIComponent(S.me.patient_id) + "/emergencies" : "/emergencies";
  const r = await safe(() => api(path));
  S.emErr = r.ok ? null : r.err.message;
  if (r.ok && role() === "PATIENT") {
    // the patient's list is only a summary, so read the newest few in full
    const recent = L.list(r.data).slice(0, 5);
    S.emergencies = await Promise.all(recent.map(async s => {
      const d = await safe(() => api("/emergencies/" + encodeURIComponent(s.id)));
      return d.ok ? { ...d.data, id: d.data.id || s.id } : { id: s.id, type: s.type, state: s.final_state, created_at: s.started_at };
    }));
  } else if (r.ok) S.emergencies = L.list(r.data).map(e => ({ ...e, id: e.id || e.emergency_id }));
  const rows = S.emergencies.slice().sort((a, b) => (L.parseTime(b.created_at) || 0) - (L.parseTime(a.created_at) || 0));
  if (!S.sel || !rows.some(e => e.id === S.sel)) S.sel = (rows.find(L.isActive) || rows[0] || {}).id || null;
}
const selected = () => S.emergencies.find(e => e.id === S.sel) || null;
async function loadHospitals() {
  const e = selected();
  const q = e && e.location ? "?lat=" + e.location.lat + "&lng=" + e.location.lng + "&type=" + encodeURIComponent(e.type || "") : "";
  const r = await safe(() => api("/hospitals" + q));
  S.hErr = r.ok ? null : r.err.message;
  if (r.ok) { S.hospitals = L.list(r.data); S.hospitalsFor = e ? e.type : null; }
}
async function loadAmbulances() {
  if (!isStaff()) { S.ambulances = []; S.aErr = "Ambulance positions are for hospital staff and admins."; return; }
  const r = await safe(() => api("/ambulances"));
  S.aErr = r.ok ? null : r.err.message; if (r.ok) S.ambulances = L.list(r.data);
}
function pushVitals(v) {
  S.vitals.last = v;
  for (const k of L.VITAL_KEYS) if (typeof v[k.key] === "number") S.vitals.win[k.key] = L.pushWindow(S.vitals.win[k.key] || [], v[k.key]);
}
async function loadVitals() {
  if (role() !== "PATIENT") return;                       // the backend only gives live vitals to the patient
  const pid = encodeURIComponent(S.me.patient_id);
  const r = await safe(() => api("/patients/" + pid + "/vitals"));
  if (r.ok) { S.vitals.err = null; pushVitals(r.data); } else S.vitals.err = r.err.message;
  if (!S.vitals.baseline) { const b = await safe(() => api("/patients/" + pid + "/baseline")); if (b.ok) S.vitals.baseline = b.data; }
}
async function loadPrivacy() {
  if (role() === "PATIENT") {
    const pid = encodeURIComponent(S.me.patient_id);
    const r = await safe(() => api("/patients/" + pid + "/consents")); S.consents = r.ok ? r.data : null;
    const a = await safe(() => api("/patients/" + pid + "/access-log")); S.audit = a.ok ? { patient: L.list(a.data) } : { err: a.err.message };
  } else if (role() === "ADMIN") {
    const r = await safe(() => api("/audit")); S.audit = r.ok ? { rows: L.auditRows(r.data) } : { err: r.err.message };
  } else S.audit = { staff: true };
}
async function loadDemo() {
  const r = await safe(() => api("/demo/state")); S.demo = r.ok ? r.data : null;
  $("demoPanel").hidden = !S.demo;
}

// ---- rendering ----
function renderAll() {
  renderTiles(); renderBoard(); renderMap(); renderVitals(); renderHospitals(); renderEvents(); renderPrivacy(); renderDemo();
}
function renderClockBits() { document.querySelectorAll("[data-since]").forEach(n => { n.textContent = L.elapsed(n.dataset.since); }); }

function renderTiles() {
  const t = L.tiles(S.emergencies, S.hospitals);
  const acks = S.emergencies.map(e => L.responseTimes(e).toAck);
  const avg = L.average(acks);
  const cell = (label, val, hot) => '<div class="tile' + (hot ? " hot" : "") + '"><div class="tl-l">' + label + '</div><div class="tl-v">' + val + "</div></div>";
  $("tiles").innerHTML =
    cell("Active emergencies", S.emErr ? "-" : t.active, t.critical > 0) +
    cell("Severity EMERGENCY", S.emErr ? "-" : t.critical, t.critical > 0) +
    cell("Ambulance dispatched or en route", S.emErr ? "-" : t.enRoute) +
    cell("Hospitals with free beds", S.hErr ? "-" : t.hospitalsFree + " / " + S.hospitals.length) +
    cell("Average time to hospital reply", avg == null ? "-" : L.mmss(avg));
}

function renderBoard() {
  const box = $("board");
  if (S.emErr) { box.innerHTML = '<span class="err">Emergencies: ' + esc(S.emErr) + "</span>"; return; }
  const f = $("fType").value;
  const rows = S.emergencies.filter(e => !f || e.type === f).sort((a, b) => (L.parseTime(b.created_at) || 0) - (L.parseTime(a.created_at) || 0));
  if (!rows.length) { box.className = "state"; box.textContent = f ? "No emergencies of this type." : "No emergencies right now."; return; }
  box.className = "board";
  box.innerHTML = rows.map(e => {
    const p = L.progress(e.state);
    const segs = L.MAIN_STATES.map((s, i) => "<i" + (i < p.step ? ' class="on"' : "") + ' title="' + s + '"></i>').join("");
    const hosp = e.hospital ? esc(e.hospital.name || e.hospital.id) : "no hospital yet";
    const amb = e.ambulance ? " &middot; " + esc(e.ambulance.call_sign || e.ambulance.id) : "";
    const eta = typeof e.eta_seconds === "number" ? " &middot; ETA " + L.mmss(e.eta_seconds) : "";
    return '<div class="card s-' + esc(e.severity) + (e.id === S.sel ? " sel" : "") + (S.flashIds.has(e.id) ? " flash" : "") + '" tabindex="0" role="button" data-id="' + esc(e.id) + '">' +
      '<div class="top"><span class="id">' + esc(e.id) + '</span><span><span class="chip sev-' + esc(e.severity) + '">' + esc(e.severity || "-") + '</span><span class="chip">' + esc(e.type || "-") + "</span></span></div>" +
      '<div class="meta">' + esc(e.state) + (p.tag ? ' <span class="chip bad">' + p.tag + "</span>" : "") + " &middot; step " + p.step + " of " + p.total + " &middot; open for <span data-since=\"" + esc(e.created_at) + '">' + L.elapsed(e.created_at) + "</span></div>" +
      '<div class="prog' + (p.tag === "CANCELLED" ? " cancelled" : "") + '" aria-label="Progress ' + p.pct + ' percent">' + segs + "</div>" +
      '<div class="meta">' + hosp + amb + eta + "</div>" + controls(e) + "</div>";
  }).join("");
  S.flashIds.clear();
  box.querySelectorAll(".card").forEach(c => {
    const pick = () => { S.sel = c.dataset.id; S.hospitalsFor = null; loadHospitals().then(renderAll); renderAll(); };
    c.onclick = ev => { if (!ev.target.closest("button,select,input")) pick(); };
    c.onkeydown = ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target === c) { ev.preventDefault(); pick(); } };
  });
  box.querySelectorAll("[data-act]").forEach(b => b.onclick = () => act(b.dataset.act, b.dataset.id, b));
}
function controls(e) {
  const tl = '<button class="ghost small" data-act="timeline" data-id="' + esc(e.id) + '">Timeline and reasons</button>';
  if (role() !== "HOSPITAL_STAFF") return '<div class="actions">' + tl + "</div>";
  let h = "";
  if (e.state === "SOS_SENT" || e.state === "ESCALATED") h += '<button class="small" data-act="ack" data-id="' + esc(e.id) + '">Acknowledge</button>';
  if (e.state === "HOSPITAL_ACKNOWLEDGED") {
    const free = S.ambulances.filter(a => a.status === "available");
    h += free.length
      ? '<select class="small" id="amb-' + esc(e.id) + '" aria-label="Ambulance">' + free.map(a => '<option value="' + esc(a.id) + '">' + esc(a.call_sign || a.id) + "</option>").join("") + '</select><button class="small" data-act="dispatch" data-id="' + esc(e.id) + '">Dispatch</button>'
      : '<span class="note">No ambulance available</span>';
  }
  if (e.state === "AMBULANCE_DISPATCHED" || e.state === "EN_ROUTE") h += '<button class="small ghost" data-act="drive" data-id="' + esc(e.id) + '"' + (S.driving ? " disabled" : "") + '>Drive ambulance (demo)</button>';
  if (e.state === "ARRIVED") h += '<button class="small" data-act="handover" data-id="' + esc(e.id) + '">Hand over</button>';
  return '<div class="actions">' + tl + h + "</div>";
}

async function act(name, id, btn) {
  if (name === "timeline") return openTimeline(id);
  btn.disabled = true;
  try {
    if (name === "ack") await api("/emergencies/" + id + "/ack", { method: "POST", body: {} });
    else if (name === "dispatch") await api("/emergencies/" + id + "/dispatch", { method: "POST", body: { ambulance_id: $("amb-" + id).value, eta_seconds: 240 } });
    else if (name === "handover") await api("/emergencies/" + id + "/status", { method: "POST", body: { state: "HANDOVER_DONE" } });
    else if (name === "drive") await driveAmbulance(id);
  } catch (e) { toast("Could not " + name + ": " + e.message); }
  await refreshAll();
}
function toast(msg) { S.events.unshift({ name: msg, at: new Date().toISOString(), error: true }); renderEvents(); }

async function driveAmbulance(id) {
  const e = S.emergencies.find(x => x.id === id);
  const amb = e && e.ambulance && S.ambulances.find(a => a.id === e.ambulance.id);
  if (!amb || !e.location) throw new Error("no ambulance position or patient location");
  S.driving = true;
  const steps = 8, speed = (S.demo && S.demo.speed) || 1, from = { lat: amb.lat, lng: amb.lng }, eta0 = typeof e.eta_seconds === "number" ? e.eta_seconds : 240;
  try {
    if (e.state === "AMBULANCE_DISPATCHED") await api("/emergencies/" + id + "/status", { method: "POST", body: { state: "EN_ROUTE" } });
    for (let i = 1; i <= steps; i++) {
      const lat = from.lat + (e.location.lat - from.lat) * i / steps, lng = from.lng + (e.location.lng - from.lng) * i / steps;
      await api("/ambulances/" + amb.id + "/location", { method: "POST", body: { lat, lng, eta_seconds: Math.round(eta0 * (steps - i) / steps), emergency_id: id } });
      await refreshAll();
      await new Promise(r => setTimeout(r, 1600 / speed));
    }
    await api("/emergencies/" + id + "/status", { method: "POST", body: { state: "ARRIVED" } });
  } finally { S.driving = false; }
}

// ---- map ----
function renderMap() {
  const box = $("map"), e = selected();
  if (S.hErr && !S.hospitals.length) { box.className = "state"; box.innerHTML = '<span class="err">Map: ' + esc(S.hErr) + "</span>"; return; }
  const pts = [].concat(S.hospitals, S.ambulances, e && e.location ? [e.location] : []);
  if (!pts.length) { box.className = "state"; box.textContent = "Nothing to show on the map yet."; return; }
  const W = 640, H = 400;
  const key = pts.map(p => p.id || "loc").join("|") + "|" + (e ? e.id : "");
  if (key !== S.mapKey || !S.proj) { S.proj = L.makeProjector(pts, W, H); S.mapKey = key; }
  const P = p => { const q = S.proj(p); return { x: Math.min(W - 10, Math.max(10, q.x)), y: Math.min(H - 10, Math.max(10, q.y)) }; };
  const rank = new Map(S.hospitals.filter(h => h.suitable !== false).map((h, i) => [h.id, i + 1]));
  let g = '<svg class="map" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Map of hospitals, ambulances and the patient">';
  for (let i = 1; i < 6; i++) g += '<line x1="' + i * W / 6 + '" y1="0" x2="' + i * W / 6 + '" y2="' + H + '" stroke="var(--road)"/><line x1="0" y1="' + i * H / 5 + '" x2="' + W + '" y2="' + i * H / 5 + '" stroke="var(--road)"/>';
  const pat = e && e.location ? P(e.location) : null;
  const hosp = e && e.hospital ? S.hospitals.find(h => h.id === e.hospital.id) : null;
  if (pat && hosp) { const h = P(hosp); g += '<line x1="' + pat.x + '" y1="' + pat.y + '" x2="' + h.x + '" y2="' + h.y + '" stroke="var(--accent)" stroke-width="3"/>'; }
  const ambE = e && e.ambulance && S.ambulances.find(a => a.id === e.ambulance.id);
  if (pat && ambE && (e.state === "AMBULANCE_DISPATCHED" || e.state === "EN_ROUTE")) { const a = P(ambE); g += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + pat.x + '" y2="' + pat.y + '" stroke="var(--urgent)" stroke-width="3" stroke-dasharray="7 6"/>'; }
  for (const h of S.hospitals) {
    const q = P(h), good = h.suitable !== false, r = rank.get(h.id);
    g += '<g><rect x="' + (q.x - 11) + '" y="' + (q.y - 11) + '" width="22" height="22" rx="4" fill="' + (good ? "var(--accent)" : "var(--mute)") + '"/>' +
      '<title>' + esc(h.name) + '</title><text x="' + (q.x - 14) + '" y="' + (q.y - 15) + '" text-anchor="start">' + (r && good ? "#" + r + " " : "") + esc((h.name || h.id).split(" ")[0]) + "</text></g>";
  }
  for (const a of S.ambulances) {
    const q = P(a); const eta = e && e.ambulance && e.ambulance.id === a.id && typeof e.eta_seconds === "number" ? " ETA " + L.mmss(e.eta_seconds) : "";
    g += '<g class="amb" style="transform:translate(' + q.x + "px," + q.y + 'px)"><circle r="9" fill="var(--urgent)" stroke="var(--card)" stroke-width="2"/><title>' + esc((a.call_sign || a.id) + " (" + a.status + ")") + '</title>' + (a.status !== "available" || eta ? '<text x="13" y="18">' + esc(a.call_sign || a.id) + eta + "</text>" : "") + "</g>";
  }
  if (pat) g += '<g><path d="M' + pat.x + " " + (pat.y - 14) + " l11 14 l-11 14 l-11 -14 z" + '" fill="var(--emerg)" stroke="var(--card)" stroke-width="2"/><text x="' + (pat.x + 15) + '" y="' + (pat.y + 22) + '">patient</text></g>';
  g += "</svg>";
  box.className = ""; box.innerHTML = g;
  $("mapNote").textContent = e ? e.id + (e.location && e.location.source ? " &middot; location source: " + e.location.source : "").replace("&middot;", "-") : "no emergency selected";
  if (S.aErr && !isStaff()) $("mapNote").textContent += " - " + S.aErr;
}

// ---- vitals ----
function renderVitals() {
  const box = $("vitals"), e = selected();
  let cur = null, src = "";
  if (role() === "PATIENT") {
    if (S.vitals.err && !S.vitals.last) { box.className = "state"; box.innerHTML = '<span class="err">Vitals: ' + esc(S.vitals.err) + "</span>"; return; }
    cur = S.vitals.last; src = "live from the wearable simulator, every 3 s";
  } else if (e && e.vitals_at_alert) { cur = e.vitals_at_alert; src = "readings at the moment of the alert (live vitals belong to the patient's own login)"; }
  $("vSrc").textContent = src;
  if (!cur) { box.className = "state"; box.textContent = e ? "No readings were attached to this alert." : "Select an emergency to see its readings."; return; }
  const base = S.vitals.baseline;
  box.className = "";
  box.innerHTML = '<div class="vgrid">' + L.VITAL_KEYS.map(k => {
    const v = cur[k.key], range = base && k.base ? base[k.base] : null, rel = L.vsBaseline(v, range);
    const word = { within: "within usual range", above: "above usual range", below: "below usual range", unknown: "no usual range" }[rel];
    const cls = rel === "within" ? "ok" : rel === "unknown" ? "" : "sev-URGENT";
    const win = S.vitals.win[k.key];
    return '<div class="v"><div class="u">' + k.label + '</div><div class="n">' + esc(v ?? "-") + ' <span class="u">' + k.unit + '</span></div><span class="chip ' + cls + '">' + word + "</span>" +
      (role() === "PATIENT" && win && win.length > 1 ? spark(win, range) : "") +
      (range ? '<div class="u">usual ' + range.min + "-" + range.max + "</div>" : "") + "</div>";
  }).join("") + "</div>";
}
function spark(win, range) {
  const lo = Math.min(...win, range ? range.min : Infinity) - 2, hi = Math.max(...win, range ? range.max : -Infinity) + 2, W = 200, H = 46;
  const y = v => H - 3 - (v - lo) / (hi - lo || 1) * (H - 6);
  const pts = win.map((v, i) => (i / (win.length - 1) * (W - 6) + 3).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const band = range ? '<rect x="0" y="' + y(range.max) + '" width="' + W + '" height="' + Math.max(1, y(range.min) - y(range.max)) + '" fill="var(--none-bg)"/>' : "";
  return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Last ' + win.length * 3 + ' seconds">' + band + '<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="2.5"/></svg>';
}

// ---- hospitals ----
function renderHospitals() {
  const box = $("hospitals"), e = selected(), type = e ? e.type : null;
  if (S.hErr) { box.className = "state"; box.innerHTML = '<span class="err">Hospitals: ' + esc(S.hErr) + "</span>"; return; }
  if (!S.hospitals.length) { box.className = "state"; box.textContent = "No hospitals returned."; return; }
  $("hNote").textContent = e ? "ranked for " + (type || "this") + " emergency, suitable first, then nearest" : "select an emergency to rank for its type";
  let n = 0; box.className = "";
  box.innerHTML = S.hospitals.map(h => {
    const good = h.suitable !== false, av = h.availability || {};
    const chips = [["beds_free", "beds"], ["icu_free", "ICU"]].filter(([k]) => k in av).map(([k, l]) => '<span class="chip ' + (av[k] > 0 ? "ok" : "bad") + '">' + l + " " + av[k] + "</span>").join("") +
      [["cath_lab_ready", "cath lab"], ["stroke_unit_ready", "stroke unit"]].filter(([k]) => k in av).map(([k, l]) => '<span class="chip ' + (av[k] ? "ok" : "bad") + '">' + l + (av[k] ? " ready" : " not ready") + "</span>").join("");
    const why = L.whyRanked(h, type).map(r => '<li>' + (r.ok === true ? "Yes: " : r.ok === false ? "No: " : "") + esc(r.text) + "</li>").join("");
    const isAlerted = e && e.hospital && e.hospital.id === h.id;
    return '<div class="hosp' + (good ? "" : " no") + '"><span class="rk">' + (good ? "#" + ++n : "-") + "</span><strong>" + esc(h.name) + "</strong>" +
      (isAlerted ? ' <span class="chip sev-URGENT">alerted</span>' : "") + (h.verified === false ? ' <span class="chip bad">unverified</span>' : "") + (good ? "" : ' <span class="chip">not suitable for this type</span>') +
      '<div>' + chips + '</div><details><summary class="note">Why this position</summary><ul class="tl">' + why + "</ul></details></div>";
  }).join("");
}

// ---- events ----
function renderEvents() {
  const box = $("events");
  if (!S.events.length) { box.className = "state"; box.textContent = S.live ? "Live. Waiting for events..." : "Socket is down. Polling every 3 s."; return; }
  box.className = "";
  box.innerHTML = '<ul class="events">' + S.events.map(ev => '<li' + (ev.fresh ? ' class="new"' : "") + ">" + (ev.error ? '<span class="err">' : "") + '<strong>' + esc(ev.name) + "</strong>" + (ev.error ? "</span>" : "") +
    (ev.id ? " " + esc(ev.id) : "") + (ev.state ? ' <span class="chip">' + esc(ev.state) + "</span>" : "") + ' <span class="note">' + new Date(L.parseTime(ev.at) || Date.now()).toLocaleTimeString() + "</span></li>").join("") + "</ul>";
  S.events.forEach(ev => ev.fresh = false);
}

// ---- privacy and audit ----
function renderPrivacy() {
  const box = $("privacy"), e = selected();
  const chips = c => Object.keys(c).map(k => '<span class="chip ' + (c[k] ? "ok" : "bad") + '">' + esc(k) + ": " + (c[k] ? "shared" : "not shared") + "</span>").join("");
  let h = "";
  if (role() === "PATIENT") {
    h += '<div class="note">What you share when an alert is sent:</div>' + (S.consents ? chips(S.consents.consents || {}) : '<span class="state">Not available</span>');
    h += '<h2 style="margin-top:12px">Who looked at your data</h2>';
    const rows = S.audit && S.audit.patient;
    h += rows ? (rows.length ? table(["When", "Who", "What"], rows.slice(0, 10).map(r => [r.timestamp || r.at, r.role || r.actor, r.action || r.summary])) : '<div class="state">Nobody yet.</div>') : '<span class="err">' + esc((S.audit && S.audit.err) || "Not available") + "</span>";
  } else {
    h += '<div class="note">Shared with the selected alert' + (e ? " (" + esc(e.id) + ")" : "") + ":</div>" + (e && e.consents ? chips(e.consents) : '<span class="state">Nothing selected, or consent not attached.</span>');
    h += '<div class="note">Phone numbers are never shown here.</div><h2 style="margin-top:12px">Audit log</h2>';
    if (S.audit && S.audit.staff) h += '<div class="state">The full audit log is for admins. Your own reads of alerts are recorded in it.</div>';
    else if (S.audit && S.audit.err) h += '<span class="err">' + esc(S.audit.err) + "</span>";
    else if (S.audit && S.audit.rows) {
      h += '<div class="row"><button class="ghost small" id="btnCsv">Export CSV</button><span class="note">' + S.audit.rows.length + " entries</span></div>" +
        '<div class="scroll">' + table(["When", "Who", "Action", "Patient", "Result"], S.audit.rows.slice(0, 30).map(r => [r.timestamp, r.role, r.action, r.patient_id || "-", r.outcome])) + "</div>";
    } else h += '<div class="state">Loading...</div>';
  }
  box.className = ""; box.innerHTML = h;
  const csv = $("btnCsv");
  if (csv) csv.onclick = () => {
    const url = URL.createObjectURL(new Blob([L.auditCsv(S.audit.rows)], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "healthtwin-audit.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
function table(head, rows) {
  return "<table><thead><tr>" + head.map(x => "<th>" + x + "</th>").join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + r.map(c => "<td>" + esc(c ?? "-") + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
}

// ---- demo control ----
function renderDemo() {
  const d = S.demo; if (!d) return;
  const active = document.activeElement && document.activeElement.closest && document.activeElement.closest("#demo");
  if (active) return;                                   // do not rebuild a control the person is using
  $("demo").innerHTML =
    '<div class="note">Start a ready-made emergency for the demo patient. It sends the SOS to the best hospital.</div><div class="row">' +
    ["HEART", "STROKE", "DIABETIC", "ASTHMA", "FALL"].map(t => '<button class="small" data-scn="' + t + '">' + t + "</button>").join("") + "</div>" +
    '<div class="row"><label class="inl">Speed <select id="dSpeed">' + (d.allowed_speeds || [1]).map(s => '<option' + (s === d.speed ? " selected" : "") + ">" + s + "</option>").join("") + "</select></label>" +
    '<label class="inl">Wearable <select id="dProf">' + ((d.vitals && d.vitals.profiles) || []).map(p => '<option' + (p === (d.vitals && d.vitals.profile) ? " selected" : "") + ">" + p + "</option>").join("") + "</select></label></div>" +
    '<div class="row"><button class="ghost small" id="dReset">' + (S.resetArmed ? "Click again to wipe all demo emergencies" : "Reset demo") + '</button></div><div id="dMsg" class="note"></div>';
  $("demo").querySelectorAll("[data-scn]").forEach(b => b.onclick = () => demoCall(() => api("/demo/scenario", { method: "POST", body: { type: b.dataset.scn } }), "Started " + b.dataset.scn));
  $("dSpeed").onchange = e => demoCall(() => api("/demo/speed", { method: "POST", body: { multiplier: Number(e.target.value) } }), "Speed set");
  $("dProf").onchange = e => demoCall(() => api("/demo/vitals", { method: "POST", body: { profile: e.target.value } }), "Wearable profile set");
  $("dReset").onclick = () => {
    if (!S.resetArmed) { S.resetArmed = true; setTimeout(() => { S.resetArmed = false; renderDemo(); }, 4000); return renderDemo(); }
    S.resetArmed = false; S.vitals.win = {}; demoCall(() => api("/demo/reset", { method: "POST", body: {} }), "Demo reset");
  };
}
async function demoCall(fn, okMsg) {
  try { await fn(); toast(okMsg); } catch (e) { toast("Demo: " + e.message); }
  await refreshAll();
}

// ---- timeline dialog ----
async function openTimeline(id) {
  $("dlgTitle").textContent = "Emergency " + id; $("dlgBody").textContent = "Loading..."; $("dlg").showModal();
  const [d, r, desk] = await Promise.all([safe(() => api("/emergencies/" + id)), safe(() => api("/emergencies/" + id + "/reasons")), isStaff() ? safe(() => api("/emergencies/" + id + "/desk")) : Promise.resolve({ ok: false })]);
  if (!d.ok) { $("dlgBody").innerHTML = '<span class="err">' + esc(d.err.message) + "</span>"; return; }
  const e = d.data, rt = L.responseTimes(e);
  let h = '<div class="row"><span class="chip sev-' + esc(e.severity) + '">' + esc(e.severity) + '</span><span class="chip">' + esc(e.type) + '</span><span class="chip">' + esc(e.state) + "</span></div>";
  h += '<div class="note">Time to hospital reply: ' + L.mmss(rt.toAck) + " &middot; to dispatch: " + L.mmss(rt.toDispatch) + " &middot; to arrival: " + L.mmss(rt.toArrive) + " (counted from the SOS)</div>";
  h += "<h2 style=\"margin-top:12px\">Timeline</h2><ul class=\"tl\">" + (e.timeline || []).map(t => "<li><strong>" + esc(t.state) + "</strong> at " + esc(t.timestamp) + " (+" + esc(t.seconds_since_start) + " s)</li>").join("") + "</ul>";
  if (r.ok) {
    h += "<h2 style=\"margin-top:12px\">Why the alert fired</h2><ul class=\"tl\">" + (r.data.reasons || []).map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
      '<div class="note">These come from draft rules that no doctor has reviewed yet. They support escalation and are not a diagnosis.</div>';
  } else h += '<div class="note">Reasons: ' + esc(r.err ? r.err.message : "not available") + "</div>";
  if (desk.ok) {
    const n = desk.data.notes || [], c = desk.data.chat || [];
    h += "<h2 style=\"margin-top:12px\">Desk notes and chat</h2>" + (n.length + c.length ? "<ul class=\"tl\">" + n.map(x => "<li>" + esc(x.kind) + ": " + esc(x.note) + "</li>").join("") + c.map(x => "<li>" + esc(x.sender_name || x.sender_role) + ": " + esc(x.text) + "</li>").join("") + "</ul>" : '<div class="note">None yet.</div>');
  }
  $("dlgBody").innerHTML = h;
}
$("dlgClose").onclick = () => $("dlg").close();
$("fType").onchange = renderBoard;
