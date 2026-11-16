import * as L from "./lib.js";

// ---- the only place a URL lives ----
const DEFAULT_BASE = "http://localhost:8000";
const POLL_FAST = 3000;      // socket down
const POLL_SLOW = 10000;     // socket up

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

const S = {
  base: DEFAULT_BASE, token: null, me: null, view: "overview", tab: "summary", vkey: "heart_rate", typeFilter: "",
  emergencies: [], hospitals: [], ambulances: [], loaded: false, emErr: null, hErr: null, aErr: null,
  sel: null, live: false, ws: null, wsTimer: null, pollTimer: null, tickTimer: null, collapsed: false,
  vitals: { win: {}, last: null, baseline: null, err: null },
  detail: { id: null, d: null, reasons: null, desk: null }, audit: null, consents: null, demo: null,
  events: [], flashIds: new Set(), seen: null, refreshSoon: null, proj: null, mapKey: "", trail: {}, replay: null,
  driving: false, resetArmed: false, auditText: "", auditOutcome: "", demoMsg: "",
};
const role = () => (S.me && S.me.role) || "";
const isStaff = () => role() === "HOSPITAL_STAFF" || role() === "ADMIN";

// ---- icons (small, inline, no library) ----
const ICONS = {
  overview: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  emergencies: "M12 3l10 18H2zM12 10v5M12 18v.5",
  map: "M9 4l6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14",
  hospitals: "M4 21V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v16M9 21v-5h6v5M12 8v4M10 10h4",
  vitals: "M3 12h4l2-6 4 12 2-6h6",
  privacy: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  demo: "M5 3l14 9-14 9z",
  collapse: "M15 5l-7 7 7 7",
  expand: "M9 5l7 7-7 7",
};
const icon = n => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[n] + '"/></svg>';

const ALL = ["PATIENT", "HOSPITAL_STAFF", "ADMIN"], OPS = ["HOSPITAL_STAFF", "ADMIN"];
const VIEWS = [
  { id: "overview", label: "Overview", roles: ALL, q: "Is anything happening that needs a person right now?" },
  { id: "emergencies", label: "Live Emergencies", roles: ALL, q: "Where does each emergency stand?" },
  { id: "map", label: "Map and Dispatch", roles: OPS, q: "Where is everyone, and what should happen next?" },
  { id: "hospitals", label: "Hospitals", roles: ALL, q: "Which hospital is the best fit, and why?" },
  { id: "vitals", label: "Patient Vitals", roles: ALL, q: "How do the readings compare with the patient's usual range?" },
  { id: "privacy", label: "Privacy and Audit", roles: ALL, q: "What was shared, and who looked?" },
  { id: "demo", label: "Demo Control", roles: ALL, demo: true, q: "Start a demo emergency or reset the demo." },
];
const visibleViews = () => VIEWS.filter(v => v.roles.includes(role()) && (!v.demo || S.demo));

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

// ---- login / logout ----
$("inBase").value = store.get("ht_base") || DEFAULT_BASE;
$("btnGo").onclick = login;
for (const id of ["inUser", "inPass", "inBase"]) $(id).addEventListener("keydown", e => { if (e.key === "Enter") login(); });
async function login() {
  S.base = $("inBase").value.trim().replace(/\/$/, ""); store.set("ht_base", S.base);
  $("loginMsg").textContent = "Logging in...";
  try {
    const d = await api("/auth/login", { method: "POST", body: { login: $("inUser").value.trim(), password: $("inPass").value } });
    S.token = d.token; S.me = d; start();
  } catch (e) {
    $("loginMsg").innerHTML = '<span class="err">Could not log in: ' + esc(e.message) + "</span>" +
      (e.status ? "" : "<br>Is the backend running at " + esc(S.base) + " and does it allow this page's address? See the README (CORS_ALLOW_ORIGINS).");
  }
}
$("btnOut").onclick = () => {
  stop(); S.token = null; S.me = null; S.loaded = false; S.seen = null;
  $("shell").hidden = true; $("login").hidden = false; document.title = "HealthTwin AI"; setFavicon(null);
};

function start() {
  Object.assign(S, { emergencies: [], hospitals: [], ambulances: [], events: [], sel: null, loaded: false, seen: null, trail: {}, replay: null, demo: null, audit: null,
    vitals: { win: {}, last: null, baseline: null, err: null }, detail: { id: null, d: null, reasons: null, desk: null } });
  $("login").hidden = true; $("shell").hidden = false;
  $("chRole").textContent = role().replace("_", " ").toLowerCase() + (S.me.name ? ": " + S.me.name : "");
  S.view = store.get("ht_view") || "overview";
  S.collapsed = store.get("ht_collapsed") === "1"; applyCollapsed();
  routeFix(); renderNav(); renderView(true);
  connectWS(); refreshAll(); schedulePoll();
  S.tickTimer = setInterval(() => document.querySelectorAll("[data-since]").forEach(n => { n.textContent = L.elapsed(n.dataset.since); }), 1000);
}
function stop() {
  clearTimeout(S.pollTimer); clearInterval(S.tickTimer); clearTimeout(S.wsTimer);
  if (S.ws) { S.ws.onclose = null; S.ws.close(); S.ws = null; }
}
function schedulePoll() { clearTimeout(S.pollTimer); S.pollTimer = setTimeout(async () => { await refreshAll(); schedulePoll(); }, S.live ? POLL_SLOW : POLL_FAST); }
function setLive(on, text) { S.live = on; const c = $("chLive"); c.textContent = text; c.className = "chip " + (on ? "ok" : "bad"); }

// ---- live socket ----
function connectWS() {
  clearTimeout(S.wsTimer); let ws;
  try { ws = new WebSocket(S.base.replace(/^http/, "ws") + "/ws?token=" + encodeURIComponent(S.token)); } catch (e) { setLive(false, "polling every 3 s"); return; }
  S.ws = ws;
  ws.onopen = () => setLive(true, "live");
  ws.onclose = () => { setLive(false, "polling every 3 s"); if (S.token) S.wsTimer = setTimeout(connectWS, 4000); };
  ws.onerror = () => {};
  ws.onmessage = m => { let ev; try { ev = JSON.parse(m.data); } catch (e) { return; } onEvent(ev); };
}
function onEvent(ev) {
  const name = ev.event || ev.type || "event";
  if (name === "auth.ok") return;
  S.events.unshift({ name, id: ev.emergency_id, state: ev.state, at: ev.timestamp || new Date().toISOString() });
  S.events = S.events.slice(0, 30);
  if (name === "vitals.update" && ev.payload) pushVitals(ev.payload);
  clearTimeout(S.refreshSoon); S.refreshSoon = setTimeout(refreshAll, 250);   // re-read the truth from the API
}

// ---- data loading ----
async function refreshAll() {
  await Promise.all([loadHealth(), loadEmergencies(), loadHospitals(), loadAmbulances(), loadVitals(), loadPrivacy(), loadDemo()]);
  await loadDetail();
  S.loaded = true;
  renderChrome(); renderView(false);
}
async function loadHealth() {
  const r = await safe(() => api("/health")), c = $("chHealth");
  const ok = r.ok && String(r.data.status).toLowerCase() === "ok";
  c.textContent = "system: " + (ok ? "OK" : r.ok ? String(r.data.status) : "unreachable"); c.className = "chip " + (ok ? "ok" : "bad");
}
async function loadEmergencies() {
  const path = role() === "PATIENT" ? "/patients/" + encodeURIComponent(S.me.patient_id) + "/emergencies" : "/emergencies";
  const r = await safe(() => api(path));
  S.emErr = r.ok ? null : r.err.message;
  if (r.ok && role() === "PATIENT") {
    const recent = L.list(r.data).slice(0, 5);          // the patient's list is a summary: read the newest few in full
    S.emergencies = await Promise.all(recent.map(async s => {
      const d = await safe(() => api("/emergencies/" + encodeURIComponent(s.id)));
      return d.ok ? { ...d.data, id: d.data.id || s.id } : { id: s.id, type: s.type, state: s.final_state, created_at: s.started_at };
    }));
  } else if (r.ok) S.emergencies = L.list(r.data).map(e => ({ ...e, id: e.id || e.emergency_id }));
  const ids = new Set(S.emergencies.map(e => e.id));
  if (S.seen) for (const e of S.emergencies) if (!S.seen.has(e.id)) {                // a new alert since the last look
    S.flashIds.add(e.id);
    toast("New " + (e.severity || "") + " " + (e.type || "") + " alert " + e.id, e.severity);
  }
  S.seen = ids;
  if (!S.sel || !ids.has(S.sel)) S.sel = ((L.mostSevere(S.emergencies)) || S.emergencies[0] || {}).id || null;
}
const selected = () => S.emergencies.find(e => e.id === S.sel) || null;
async function loadHospitals() {
  const e = selected();
  const q = e && e.location ? "?lat=" + e.location.lat + "&lng=" + e.location.lng + "&type=" + encodeURIComponent(e.type || "") : "";
  const r = await safe(() => api("/hospitals" + q));
  S.hErr = r.ok ? null : r.err.message; if (r.ok) S.hospitals = L.list(r.data);
}
async function loadAmbulances() {
  if (!isStaff()) { S.ambulances = []; return; }
  const r = await safe(() => api("/ambulances"));
  S.aErr = r.ok ? null : r.err.message;
  if (r.ok) {
    S.ambulances = L.list(r.data);
    for (const a of S.ambulances) if (Number.isFinite(a.lat) && Number.isFinite(a.lng)) S.trail[a.id] = L.appendTrail(S.trail[a.id] || [], { lat: a.lat, lng: a.lng, t: Date.now() });
  }
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
  if (S.view !== "privacy" && S.audit) return;            // only the Privacy view needs it
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
}
async function loadDetail() {
  const id = S.sel; if (!id || S.view !== "emergencies") return;
  const [d, r, desk] = await Promise.all([safe(() => api("/emergencies/" + encodeURIComponent(id))), safe(() => api("/emergencies/" + encodeURIComponent(id) + "/reasons")),
    isStaff() ? safe(() => api("/emergencies/" + encodeURIComponent(id) + "/desk")) : Promise.resolve({ ok: false })]);
  S.detail = { id, d: d.ok ? d.data : null, derr: d.ok ? null : d.err.message, reasons: r.ok ? r.data : null, rerr: r.ok ? null : (r.err && r.err.message), desk: desk.ok ? desk.data : null };
}

// ---- chrome: nav, title, favicon, toasts ----
function applyCollapsed() {
  $("shell").classList.toggle("collapsed", !!S.collapsed);
  $("icCollapse").innerHTML = icon(S.collapsed ? "expand" : "collapse");
  $("btnCollapse").setAttribute("aria-label", S.collapsed ? "Expand the menu" : "Collapse the menu");
}
$("btnCollapse").onclick = () => { S.collapsed = !S.collapsed; store.set("ht_collapsed", S.collapsed ? "1" : "0"); applyCollapsed(); };
function renderNav() {
  const active = S.emergencies.filter(L.isActive).length;
  $("navItems").innerHTML = visibleViews().map((v, i) =>
    '<button class="navbtn" data-view="' + v.id + '"' + (v.id === S.view ? ' aria-current="page"' : "") + ' title="' + esc(v.label) + '">' + icon(v.id) + '<span class="lbl">' + esc(v.label) + '</span><span class="num">' + (i + 1) + "</span>" +
    (v.id === "emergencies" && active ? '<span class="dot" aria-label="' + active + ' active">' + active + "</span>" : "") + "</button>").join("");
  $("navItems").querySelectorAll("[data-view]").forEach(b => b.onclick = () => go(b.dataset.view));
}
function renderChrome() {
  renderNav();
  document.title = L.pageTitle(S.emergencies);
  const top = L.mostSevere(S.emergencies); setFavicon(top ? top.severity : "NONE");
}
function setFavicon(sev) {
  const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d");
  x.fillStyle = { EMERGENCY: "#c4182b", URGENT: "#d9730d", WATCH: "#c9a300", NONE: "#1b7f5a" }[sev] || "#6b7b8a";
  x.beginPath(); x.arc(16, 16, 14, 0, 7); x.fill();
  $("fav").href = c.toDataURL("image/png");
}
function toast(msg, sev) {
  const t = document.createElement("div"); t.className = "toast" + (sev ? " sev-" + sev : ""); t.textContent = msg; $("toasts").appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

// ---- routing ----
function routeFix() { if (!visibleViews().some(v => v.id === S.view)) S.view = "overview"; }
function go(id) {
  S.view = id; store.set("ht_view", id); routeFix(); renderNav(); renderView(true);
  if (id === "emergencies" || id === "privacy" || id === "vitals") refreshAll();
  $("view").focus({ preventScroll: true });
}

function renderView(force) {
  const a = document.activeElement;
  if (!force && a && $("view").contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;     // never rebuild a control in use
  const v = VIEWS.find(x => x.id === S.view); $("viewTitle").textContent = v.label;
  if (!S.loaded) { $("view").innerHTML = '<p class="question">' + esc(v.q) + '</p><div class="skel"></div><div class="skel"></div><div class="skel"></div>'; return; }
  const fn = { overview: vOverview, emergencies: vEmergencies, map: vMap, hospitals: vHospitals, vitals: vVitals, privacy: vPrivacy, demo: vDemo }[S.view];
  $("view").innerHTML = '<p class="question">' + esc(v.q) + "</p>" + fn();
  bindView();
  if (S.view === "privacy") auditTable();
}
function bindView() {
  const V = $("view");
  V.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { if (b.dataset.id) { S.sel = b.dataset.id; S.tab = "summary"; } go(b.dataset.go); });
  V.querySelectorAll("[data-sel]").forEach(b => b.onclick = () => { S.sel = b.dataset.sel; S.tab = "summary"; S.replay = null; loadHospitals(); refreshAll(); });
  V.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; renderView(true); });
  V.querySelectorAll("[data-act]").forEach(b => b.onclick = () => act(b.dataset.act, b.dataset.id, b));
  V.querySelectorAll("[data-vkey]").forEach(b => b.onclick = () => { S.vkey = b.dataset.vkey; renderView(true); });
  const f = V.querySelector("#fType"); if (f) f.onchange = e => { S.typeFilter = e.target.value; renderView(true); };
  const rp = V.querySelector("#replay"); if (rp) rp.oninput = e => { S.replay = Number(e.target.value); renderView(true); V.querySelector("#replay").focus(); };
  const live = V.querySelector("#replayLive"); if (live) live.onclick = () => { S.replay = null; renderView(true); };
  const as = V.querySelector("#aSearch"); if (as) as.oninput = e => { S.auditText = e.target.value; auditTable(); };
  const ao = V.querySelector("#aOutcome"); if (ao) ao.onchange = e => { S.auditOutcome = e.target.value; auditTable(); };
  const csv = V.querySelector("#btnCsv"); if (csv) csv.onclick = downloadCsv;
  V.querySelectorAll("[data-scn]").forEach(b => b.onclick = () => demoCall(() => api("/demo/scenario", { method: "POST", body: { type: b.dataset.scn } }), "Started " + b.dataset.scn));
  const sp = V.querySelector("#dSpeed"); if (sp) sp.onchange = e => demoCall(() => api("/demo/speed", { method: "POST", body: { multiplier: Number(e.target.value) } }), "Speed set to " + e.target.value);
  const pf = V.querySelector("#dProf"); if (pf) pf.onchange = e => demoCall(() => api("/demo/vitals", { method: "POST", body: { profile: e.target.value } }), "Wearable profile set");
  const rs = V.querySelector("#dReset"); if (rs) rs.onclick = () => {
    if (!S.resetArmed) { S.resetArmed = true; setTimeout(() => { S.resetArmed = false; if (S.view === "demo") renderView(true); }, 5000); return renderView(true); }
    S.resetArmed = false; S.vitals.win = {}; S.trail = {}; S.seen = null; demoCall(() => api("/demo/reset", { method: "POST", body: {} }), "Demo reset");
  };
}

// ---- view: Overview ----
function vOverview() {
  if (S.emErr) return '<div class="panel"><span class="err">Emergencies: ' + esc(S.emErr) + '</span><p class="note">Check that the backend is running and you are logged in.</p></div>';
  const t = L.tiles(S.emergencies, S.hospitals);
  const waiting = S.emergencies.filter(e => e.state === "SOS_SENT" || e.state === "ESCALATED").length;
  const tile = (l, v, hot) => '<div class="tile' + (hot ? " hot" : "") + '"><div class="tl-l">' + l + '</div><div class="tl-v">' + v + "</div></div>";
  const top = L.mostSevere(S.emergencies), p = top ? L.progress(top.state) : null;
  const attn = top
    ? '<div class="panel attn s-' + esc(top.severity) + '"><h3>Needs attention now</h3><div class="row"><span class="big">' + esc(top.type) + " emergency</span>" +
      '<span class="chip sev-' + esc(top.severity) + '">' + esc(top.severity) + '</span><span class="chip">' + esc(top.state) + "</span></div>" +
      '<div class="prog" aria-label="Step ' + p.step + " of " + p.total + '">' + L.MAIN_STATES.map((s, i) => "<i" + (i < p.step ? ' class="on"' : "") + "></i>").join("") + "</div>" +
      '<p class="note">' + esc(top.id) + ' &middot; open for <span data-since="' + esc(top.created_at) + '">' + L.elapsed(top.created_at) + "</span> &middot; " +
      (top.hospital ? esc(top.hospital.name || top.hospital.id) : "no hospital yet") + "</p>" +
      '<button class="primary" data-go="emergencies" data-id="' + esc(top.id) + '">Open this emergency</button></div>'
    : '<div class="panel empty"><strong>No active emergencies</strong>' + (S.demo ? 'Start a practice one in <button class="ghost small" data-go="demo">Demo Control</button>.' : "Nothing needs a person right now.") + "</div>";
  const ev = S.events.slice(0, 5);
  const evs = '<div class="panel"><h3>Recent events</h3>' + (ev.length ? '<ul class="events">' + ev.map(e => "<li><strong>" + esc(e.name) + "</strong>" + (e.id ? " " + esc(e.id) : "") + (e.state ? ' <span class="chip">' + esc(e.state) + "</span>" : "") + '<span class="note">' + new Date(L.parseTime(e.at) || Date.now()).toLocaleTimeString() + "</span></li>").join("") + "</ul>" : '<div class="note">' + (S.live ? "Live. Nothing has happened since you opened this page." : "Socket is down. Polling every 3 s.") + "</div>") + "</div>";
  return '<div class="stack"><div class="tiles">' + tile("Active emergencies", t.active, t.critical > 0) + tile("Waiting for a hospital reply", waiting, waiting > 0) +
    tile("Ambulances out", t.enRoute) + tile("Hospitals with free beds", S.hErr ? "-" : t.hospitalsFree + " of " + S.hospitals.length) + "</div>" + attn + evs + "</div>";
}

// ---- view: Live Emergencies (list + detail) ----
function vEmergencies() {
  if (S.emErr) return '<div class="panel"><span class="err">Emergencies: ' + esc(S.emErr) + "</span></div>";
  const rows = S.emergencies.filter(e => !S.typeFilter || e.type === S.typeFilter).sort((a, b) => (L.parseTime(b.created_at) || 0) - (L.parseTime(a.created_at) || 0));
  const filter = '<div class="row" style="margin-bottom:10px"><label class="note" for="fType">Type</label><select id="fType">' +
    ["", "HEART", "STROKE", "DIABETIC", "ASTHMA", "FALL"].map(t => '<option value="' + t + '"' + (t === S.typeFilter ? " selected" : "") + ">" + (t || "All") + "</option>").join("") + "</select></div>";
  const list = rows.length ? '<div class="list">' + rows.map(e => '<button class="item s-' + esc(e.severity) + (e.id === S.sel ? " sel" : "") + (S.flashIds.has(e.id) ? " flash" : "") + '" data-sel="' + esc(e.id) + '"' + (e.id === S.sel ? ' aria-current="true"' : "") + ">" +
      '<div class="row"><strong>' + esc(e.type) + '</strong><span class="chip sev-' + esc(e.severity) + '">' + esc(e.severity || "-") + '</span></div><div class="note">' + esc(e.state) + ' &middot; <span data-since="' + esc(e.created_at) + '">' + L.elapsed(e.created_at) + "</span></div></button>").join("") + "</div>"
    : '<div class="panel empty"><strong>' + (S.typeFilter ? "None of this type" : "No emergencies yet") + "</strong>" + (S.demo && !S.typeFilter ? "Start one in Demo Control." : "") + "</div>";
  S.flashIds.clear();
  return '<div class="md"><div>' + filter + list + "</div><div>" + detail() + "</div></div>";
}
function detail() {
  const e = selected(); if (!e) return '<div class="panel empty"><strong>Select an emergency</strong>Its details open here.</div>';
  const D = S.detail.id === e.id ? S.detail : { d: null };
  const d = D.d || e;
  const tabs = [["summary", "Summary"], ["timeline", "Timeline"], ["reasons", "Reasons"]].concat(isStaff() ? [["desk", "Desk notes"]] : []);
  if (!tabs.some(t => t[0] === S.tab)) S.tab = "summary";
  let body = "";
  if (S.tab === "summary") {
    const rt = L.responseTimes(d);
    body = '<dl class="kv"><dt>Type</dt><dd>' + esc(d.type) + '</dd><dt>Severity</dt><dd><span class="chip sev-' + esc(d.severity) + '">' + esc(d.severity) + "</span></dd><dt>State</dt><dd>" + esc(d.state) + "</dd>" +
      "<dt>Hospital</dt><dd>" + (d.hospital ? esc(d.hospital.name || d.hospital.id) : "none yet") + "</dd><dt>Ambulance</dt><dd>" + (d.ambulance ? esc(d.ambulance.call_sign || d.ambulance.id) + (typeof d.eta_seconds === "number" ? ", ETA " + L.mmss(d.eta_seconds) : "") : "none yet") + "</dd>" +
      "<dt>To hospital reply</dt><dd>" + L.mmss(rt.toAck) + "</dd><dt>To dispatch</dt><dd>" + L.mmss(rt.toDispatch) + "</dd><dt>To arrival</dt><dd>" + L.mmss(rt.toArrive) + "</dd></dl>" +
      '<p class="note">Times are counted from the moment the SOS was sent.</p>' + (isStaff() ? '<p><button class="primary" data-go="map" data-id="' + esc(e.id) + '">Open on map</button></p>' : "");
  } else if (S.tab === "timeline") {
    const tl = d.timeline || [];
    body = tl.length ? '<ul class="tl">' + tl.map(t => "<li><strong>" + esc(t.state) + '</strong> <span class="note">' + esc(t.timestamp) + " (+" + esc(t.seconds_since_start) + " s)</span></li>").join("") + "</ul>" : '<div class="note">No timeline was returned.</div>';
  } else if (S.tab === "reasons") {
    body = D.reasons ? '<ul class="tl">' + (D.reasons.reasons || []).map(x => "<li>" + esc(x) + "</li>").join("") + '</ul><p class="note">These come from draft rules that no doctor has reviewed yet. They support escalation and are not a diagnosis.</p>'
      : '<div class="note">Reasons are not available: ' + esc(D.rerr || "loading") + "</div>";
  } else {
    const n = (D.desk && D.desk.notes) || [], c = (D.desk && D.desk.chat) || [];
    body = n.length + c.length ? '<ul class="tl">' + n.map(x => "<li>" + esc(x.kind) + ": " + esc(x.note) + "</li>").join("") + c.map(x => "<li>" + esc(x.sender_name || x.sender_role) + ": " + esc(x.text) + "</li>").join("") + "</ul>" : '<div class="note">Nobody has written a note yet.</div>';
  }
  return '<div class="panel"><h2>' + esc(e.id) + '</h2><div class="tabs" role="tablist">' + tabs.map(([id, l]) => '<button class="tab" role="tab" aria-selected="' + (id === S.tab) + '" data-tab="' + id + '">' + l + "</button>").join("") + "</div>" + body + "</div>";
}

// ---- view: Map and Dispatch ----
function vMap() {
  const e = selected();
  if (S.hErr && !S.hospitals.length) return '<div class="panel"><span class="err">Map: ' + esc(S.hErr) + "</span></div>";
  return '<div class="mapwrap"><div>' + mapSvg(e) + '<div class="legend" aria-hidden="true"><span>&#9632; hospital</span><span>&#9679; ambulance</span><span>&#9670; patient</span></div>' + replayBar(e) + "</div>" + sheet(e) + "</div>";
}
function mapSvg(e) {
  const pts = [].concat(S.hospitals, S.ambulances, e && e.location ? [e.location] : []);
  if (!pts.length) return '<div class="panel empty"><strong>Nothing to place yet</strong>Hospitals and ambulances appear here.</div>';
  const W = 900, H = 540, key = pts.map(p => p.id || "loc").join("|") + (e ? e.id : "");
  if (key !== S.mapKey || !S.proj) { S.proj = L.makeProjector(pts, W, H, 50); S.mapKey = key; }
  const P = p => { const q = S.proj(p); return { x: Math.min(W - 12, Math.max(12, q.x)), y: Math.min(H - 12, Math.max(12, q.y)) }; };
  let g = '<svg class="map" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Map of hospitals, ambulances and the patient (simulated)">';
  for (let i = 1; i < 8; i++) g += '<line x1="' + i * W / 8 + '" y1="0" x2="' + i * W / 8 + '" y2="' + H + '" stroke="var(--road)"/>';
  for (let i = 1; i < 5; i++) g += '<line x1="0" y1="' + i * H / 5 + '" x2="' + W + '" y2="' + i * H / 5 + '" stroke="var(--road)"/>';
  const pat = e && e.location ? P(e.location) : null, hosp = e && e.hospital ? S.hospitals.find(h => h.id === e.hospital.id) : null;
  const ambE = e && e.ambulance && S.ambulances.find(a => a.id === e.ambulance.id);
  if (pat && hosp) { const h = P(hosp); g += '<line x1="' + pat.x + '" y1="' + pat.y + '" x2="' + h.x + '" y2="' + h.y + '" stroke="var(--accent)" stroke-width="3"/>'; }
  if (pat && ambE && (e.state === "AMBULANCE_DISPATCHED" || e.state === "EN_ROUTE")) { const a = P(ambE); g += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + pat.x + '" y2="' + pat.y + '" stroke="var(--urgent)" stroke-width="3" stroke-dasharray="8 6"/>'; }
  const trail = ambE ? S.trail[ambE.id] || [] : [];
  if (S.replay != null && trail.length > 1) {
    const upto = trail.slice(0, S.replay + 1).map(P);
    g += '<polyline points="' + upto.map(q => q.x + "," + q.y).join(" ") + '" fill="none" stroke="var(--urgent)" stroke-width="3" opacity=".55"/>';
    const q = upto[upto.length - 1]; g += '<circle cx="' + q.x + '" cy="' + q.y + '" r="13" fill="none" stroke="var(--urgent)" stroke-width="3"/>';
  }
  const rank = new Map(S.hospitals.filter(h => h.suitable !== false).map((h, i) => [h.id, i + 1]));
  for (const h of S.hospitals) {
    const q = P(h), good = h.suitable !== false, r = rank.get(h.id);
    g += "<g><title>" + esc(h.name) + '</title><rect x="' + (q.x - 12) + '" y="' + (q.y - 12) + '" width="24" height="24" rx="5" fill="' + (good ? "var(--accent)" : "var(--mute)") + '"/><text x="' + (q.x - 14) + '" y="' + (q.y - 18) + '">' + (r && good ? "#" + r + " " : "") + esc((h.name || h.id).split(" ")[0]) + "</text></g>";
  }
  for (const a of S.ambulances) {
    const q = P(a), eta = e && e.ambulance && e.ambulance.id === a.id && typeof e.eta_seconds === "number" ? " ETA " + L.mmss(e.eta_seconds) : "";
    g += "<g><title>" + esc((a.call_sign || a.id) + " (" + a.status + ")") + '</title><circle cx="' + q.x + '" cy="' + q.y + '" r="10" fill="var(--urgent)" stroke="var(--card)" stroke-width="2"/>' + (a.status !== "available" || eta ? '<text x="' + (q.x + 14) + '" y="' + (q.y + 20) + '">' + esc(a.call_sign || a.id) + eta + "</text>" : "") + "</g>";
  }
  if (pat) g += '<g><path d="M' + pat.x + " " + (pat.y - 15) + " l12 15 l-12 15 l-12 -15 z" + '" fill="var(--emerg)" stroke="var(--card)" stroke-width="2"/><text x="' + (pat.x + 16) + '" y="' + (pat.y + 24) + '">patient</text></g>';
  return g + "</svg>";
}
function replayBar(e) {
  const amb = e && e.ambulance && S.ambulances.find(a => a.id === e.ambulance.id), tr = amb ? S.trail[amb.id] || [] : [];
  if (tr.length < 2) return '<p class="note">Route replay appears once the ambulance has moved while this page was open.</p>';
  const v = S.replay == null ? tr.length - 1 : S.replay;
  return '<div class="panel" style="margin-top:10px"><label for="replay"><strong>Route replay</strong> <span class="note">(only positions seen since this page opened, ' + tr.length + " points)</span></label>" +
    '<input id="replay" type="range" min="0" max="' + (tr.length - 1) + '" value="' + v + '"><div class="row"><span class="note">' + (S.replay == null ? "live" : "step " + (v + 1) + " of " + tr.length) + "</span>" + (S.replay != null ? '<button class="ghost small" id="replayLive">Back to live</button>' : "") + "</div></div>";
}
function sheet(e) {
  if (!e) return '<div class="panel sheet empty"><strong>No emergency selected</strong>Pick one in Live Emergencies.</div>';
  const p = L.progress(e.state);
  let action = "";
  if (role() !== "HOSPITAL_STAFF") action = '<p class="note">' + (role() === "ADMIN" ? "Admins can watch. Only hospital staff can acknowledge or dispatch." : "") + "</p>";
  else if (e.state === "SOS_SENT" || e.state === "ESCALATED") action = '<button class="primary" data-act="ack" data-id="' + esc(e.id) + '">Acknowledge this alert</button>';
  else if (e.state === "HOSPITAL_ACKNOWLEDGED") {
    const free = S.ambulances.filter(a => a.status === "available");
    action = free.length ? '<label class="note" for="ambSel">Ambulance</label><select id="ambSel">' + free.map(a => '<option value="' + esc(a.id) + '">' + esc(a.call_sign || a.id) + "</option>").join("") + '</select><button class="primary" data-act="dispatch" data-id="' + esc(e.id) + '">Dispatch</button>' : '<span class="note">No ambulance is available right now.</span>';
  } else if (e.state === "AMBULANCE_DISPATCHED" || e.state === "EN_ROUTE") action = '<button class="primary" data-act="drive" data-id="' + esc(e.id) + '"' + (S.driving ? " disabled" : "") + '>Drive ambulance (demo)</button><span class="note">Posts real location updates, then marks it arrived.</span>';
  else if (e.state === "ARRIVED") action = '<button class="primary" data-act="handover" data-id="' + esc(e.id) + '">Confirm handover</button>';
  return '<div class="panel sheet"><h3>' + esc(e.id) + '</h3><div class="row"><span class="chip sev-' + esc(e.severity) + '">' + esc(e.severity) + '</span><span class="chip">' + esc(e.type) + "</span></div><p>" + esc(e.state) + " (step " + p.step + " of " + p.total + ")</p>" +
    '<p class="note">' + (e.hospital ? esc(e.hospital.name || e.hospital.id) : "no hospital yet") + (e.ambulance ? " &middot; " + esc(e.ambulance.call_sign || e.ambulance.id) : "") + (typeof e.eta_seconds === "number" ? " &middot; ETA " + L.mmss(e.eta_seconds) : "") + '</p><div class="act">' + action + "</div></div>";
}
async function act(name, id, btn) {
  btn.disabled = true;
  try {
    if (name === "ack") await api("/emergencies/" + id + "/ack", { method: "POST", body: {} });
    else if (name === "dispatch") await api("/emergencies/" + id + "/dispatch", { method: "POST", body: { ambulance_id: $("ambSel").value, eta_seconds: 240 } });
    else if (name === "handover") await api("/emergencies/" + id + "/status", { method: "POST", body: { state: "HANDOVER_DONE" } });
    else if (name === "drive") await driveAmbulance(id);
  } catch (e) { toast("Could not " + name + ": " + e.message, "URGENT"); }
  await refreshAll();
}
async function driveAmbulance(id) {
  const e = S.emergencies.find(x => x.id === id), amb = e && e.ambulance && S.ambulances.find(a => a.id === e.ambulance.id);
  if (!amb || !e.location) throw new Error("no ambulance position or patient location");
  S.driving = true;
  const steps = 8, speed = (S.demo && S.demo.speed) || 1, from = { lat: amb.lat, lng: amb.lng }, eta0 = typeof e.eta_seconds === "number" ? e.eta_seconds : 240;
  try {
    if (e.state === "AMBULANCE_DISPATCHED") await api("/emergencies/" + id + "/status", { method: "POST", body: { state: "EN_ROUTE" } });
    for (let i = 1; i <= steps; i++) {
      const lat = from.lat + (e.location.lat - from.lat) * i / steps, lng = from.lng + (e.location.lng - from.lng) * i / steps;
      await api("/ambulances/" + amb.id + "/location", { method: "POST", body: { lat, lng, eta_seconds: Math.round(eta0 * (steps - i) / steps), emergency_id: id } });
      await refreshAll(); await new Promise(r => setTimeout(r, 1600 / speed));
    }
    await api("/emergencies/" + id + "/status", { method: "POST", body: { state: "ARRIVED" } });
  } finally { S.driving = false; }
}

// ---- view: Hospitals ----
function vHospitals() {
  if (S.hErr) return '<div class="panel"><span class="err">Hospitals: ' + esc(S.hErr) + "</span></div>";
  if (!S.hospitals.length) return '<div class="panel empty"><strong>No hospitals returned</strong></div>';
  const e = selected(), type = e ? e.type : null; let n = 0;
  const head = '<p class="note">' + (e ? "Ranked for the selected " + esc(type) + " emergency (" + esc(e.id) + "): suitable first, then nearest." : "No emergency selected, so this is the plain list.") + "</p>";
  return head + S.hospitals.map(h => {
    const good = h.suitable !== false, av = h.availability || {};
    const chips = [["beds_free", "beds"], ["icu_free", "ICU"]].filter(([k]) => k in av).map(([k, l]) => '<span class="chip ' + (av[k] > 0 ? "ok" : "bad") + '">' + l + " " + av[k] + "</span>").join(" ") + " " +
      [["cath_lab_ready", "cath lab"], ["stroke_unit_ready", "stroke unit"]].filter(([k]) => k in av).map(([k, l]) => '<span class="chip ' + (av[k] ? "ok" : "bad") + '">' + l + (av[k] ? " ready" : " not ready") + "</span>").join(" ");
    const why = L.whyRanked(h, type).map(r => "<li>" + (r.ok === true ? "Yes: " : r.ok === false ? "No: " : "") + esc(r.text) + "</li>").join("");
    return '<div class="hosp' + (good ? "" : " no") + '"><div class="row"><span class="rk">' + (good && e ? "#" + ++n : "-") + "</span><strong>" + esc(h.name) + "</strong>" +
      (e && e.hospital && e.hospital.id === h.id ? '<span class="chip sev-URGENT">alerted</span>' : "") + (h.verified === false ? '<span class="chip bad">unverified</span>' : "") + (e && !good ? '<span class="chip">not suitable for this type</span>' : "") + '</div><div style="margin-top:6px">' + chips + "</div>" +
      '<details><summary>Why this position</summary><ul class="tl">' + why + "</ul></details></div>";
  }).join("");
}

// ---- view: Patient Vitals ----
function vVitals() {
  const e = selected(); let cur = null, src = "";
  if (role() === "PATIENT") { if (S.vitals.err && !S.vitals.last) return '<div class="panel"><span class="err">Vitals: ' + esc(S.vitals.err) + "</span></div>"; cur = S.vitals.last; src = "Live from the wearable simulator, every 3 seconds."; }
  else if (e && e.vitals_at_alert) { cur = e.vitals_at_alert; src = "The readings attached to " + e.id + " at the moment of the alert. Live vitals belong to the patient's own login."; }
  if (!cur) return '<div class="panel empty"><strong>No readings yet</strong>' + (role() === "PATIENT" ? "Waiting for the wearable." : "Select an emergency that carries readings.") + "</div>";
  const base = S.vitals.baseline, cards = L.VITAL_KEYS.map(k => {
    const v = cur[k.key], range = base && k.base ? base[k.base] : null, rel = L.vsBaseline(v, range);
    const word = { within: "within usual range", above: "above usual range", below: "below usual range", unknown: "no usual range known" }[rel];
    return '<button class="vcard" data-vkey="' + k.key + '" aria-selected="' + (k.key === S.vkey) + '"><div class="u">' + k.label + '</div><div class="n">' + esc(v ?? "-") + ' <span class="u">' + k.unit + '</span></div><span class="chip ' + (rel === "within" ? "ok" : rel === "unknown" ? "" : "sev-URGENT") + '">' + word + "</span></button>";
  }).join("");
  const k = L.VITAL_KEYS.find(x => x.key === S.vkey) || L.VITAL_KEYS[0], win = S.vitals.win[k.key], range = base && k.base ? base[k.base] : null;
  const chart = role() === "PATIENT" && win && win.length > 1 ? trend(win, range, k) : '<div class="empty"><strong>No trend for this view</strong>' + (role() === "PATIENT" ? "Collecting readings..." : "A trend needs the patient's own login.") + "</div>";
  return '<p class="note">' + esc(src) + ' <span class="chip sim2">simulated</span></p><div class="stack"><div class="vbig">' + cards + '</div><div class="panel"><h3>' + esc(k.label) + " trend</h3>" + chart +
    (range ? '<p class="note">Shaded band: this patient\'s usual range, ' + range.min + " to " + range.max + " " + k.unit + ".</p>" : "") + '<p class="note">Colours and words compare a reading with the patient\'s own usual range. They are display aids, not a diagnosis. A person decides what to do next.</p></div></div>';
}
function trend(win, range, k) {
  const W = 800, H = 240, lo = Math.min(...win, range ? range.min : Infinity) - 3, hi = Math.max(...win, range ? range.max : -Infinity) + 3;
  const y = v => H - 22 - (v - lo) / (hi - lo || 1) * (H - 44), x = i => 40 + i / (win.length - 1) * (W - 60);
  const band = range ? '<rect x="40" y="' + y(range.max) + '" width="' + (W - 60) + '" height="' + Math.max(1, y(range.min) - y(range.max)) + '" fill="var(--none-bg)"/>' : "";
  return '<svg class="trend" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(k.label) + " over the last " + win.length * 3 + ' seconds">' + band +
    '<polyline points="' + win.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ") + '" fill="none" stroke="var(--accent)" stroke-width="3.5"/>' +
    '<text x="6" y="22" fill="var(--mute)" font-size="14">' + hi.toFixed(0) + '</text><text x="6" y="' + (H - 8) + '" fill="var(--mute)" font-size="14">' + lo.toFixed(0) + "</text></svg>";
}

// ---- view: Privacy and Audit ----
function vPrivacy() {
  const e = selected(), chips = c => Object.keys(c).map(k => '<span class="chip ' + (c[k] ? "ok" : "bad") + '">' + esc(k) + ": " + (c[k] ? "shared" : "not shared") + "</span>").join(" ");
  let h = '<div class="stack"><div class="panel"><h3>' + (role() === "PATIENT" ? "What you share when an alert is sent" : "Shared with the selected alert" + (e ? " (" + esc(e.id) + ")" : "")) + "</h3>" +
    (role() === "PATIENT" ? (S.consents ? chips(S.consents.consents || {}) : '<span class="note">Not available</span>') : (e && e.consents ? chips(e.consents) : '<span class="note">Select an emergency to see what it shares.</span>')) + '<p class="note">Phone numbers are never shown in this dashboard.</p></div>';
  h += '<div class="panel"><h3>' + (role() === "PATIENT" ? "Who looked at your data" : "Audit log") + "</h3>";
  if (!S.audit) h += '<div class="skel"></div>';
  else if (S.audit.staff) h += '<div class="empty"><strong>Admins only</strong>The full audit log is for admins. Your own reads of alerts are recorded in it.</div>';
  else if (S.audit.err) h += '<span class="err">' + esc(S.audit.err) + '</span><p class="note">Try logging in again.</p>';
  else if (S.audit.patient) h += S.audit.patient.length ? table(["When", "Who", "What"], S.audit.patient.slice(0, 20).map(r => [r.timestamp || r.at, r.role || r.actor, r.action || r.summary])) : '<div class="empty"><strong>Nobody yet</strong>Nobody has looked at your data.</div>';
  else h += '<div class="filters"><input id="aSearch" placeholder="Search who, what, patient..." aria-label="Search the audit log" value="' + esc(S.auditText) + '"><select id="aOutcome" aria-label="Filter by result"><option value="">All results</option><option value="allowed"' + (S.auditOutcome === "allowed" ? " selected" : "") + '>allowed</option><option value="denied"' + (S.auditOutcome === "denied" ? " selected" : "") + '>denied</option></select><button class="ghost" id="btnCsv">Export CSV</button></div><div id="auditBox"></div>';
  return h + "</div></div>";
}
function auditTable() {
  const box = $("auditBox"); if (!box || !S.audit || !S.audit.rows) return;
  const rows = L.filterAudit(S.audit.rows, S.auditText, S.auditOutcome);
  box.innerHTML = '<p class="note">' + rows.length + " of " + S.audit.rows.length + " entries</p>" + (rows.length ? '<div class="scroll">' + table(["When", "Role", "Action", "Patient", "Result"], rows.slice(0, 100).map(r => [r.timestamp, r.role, r.action, r.patient_id || "-", r.outcome])) + "</div>" : '<div class="empty"><strong>Nothing matches</strong>Clear the search to see all entries.</div>');
}
function downloadCsv() {
  const rows = L.filterAudit(S.audit.rows, S.auditText, S.auditOutcome);
  const url = URL.createObjectURL(new Blob([L.auditCsv(rows)], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "healthtwin-audit.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function table(head, rows) {
  return "<table><thead><tr>" + head.map(x => "<th>" + x + "</th>").join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + r.map(c => "<td>" + esc(c ?? "-") + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
}

// ---- view: Demo Control ----
function vDemo() {
  const d = S.demo; if (!d) return '<div class="panel empty"><strong>Demo mode is off</strong>The backend is not in DEMO_MODE.</div>';
  return '<div class="stack"><div class="panel"><h3>Start a ready-made emergency</h3><p class="note">It runs for the demo patient and sends the SOS to the best hospital.</p><div class="row">' +
    ["HEART", "STROKE", "DIABETIC", "ASTHMA", "FALL"].map((t, i) => '<button class="' + (i === 0 ? "primary" : "ghost") + '" data-scn="' + t + '">' + t + "</button>").join("") + "</div></div>" +
    '<div class="panel"><h3>Pace and wearable</h3><div class="row"><label for="dSpeed">Speed</label><select id="dSpeed">' + (d.allowed_speeds || [1]).map(s => "<option" + (s === d.speed ? " selected" : "") + ">" + s + "</option>").join("") + '</select><label for="dProf">Wearable profile</label><select id="dProf">' +
    ((d.vitals && d.vitals.profiles) || []).map(p => "<option" + (p === (d.vitals && d.vitals.profile) ? " selected" : "") + ">" + p + "</option>").join("") + "</select></div></div>" +
    '<div class="panel"><h3>Reset</h3><p class="note">Removes every demo emergency and puts the seed data back.</p><button class="' + (S.resetArmed ? "primary" : "ghost") + '" id="dReset">' + (S.resetArmed ? "Click again to confirm the reset" : "Reset demo") + '</button></div><div class="note" role="status">' + esc(S.demoMsg) + "</div></div>";
}
async function demoCall(fn, okMsg) {
  try { await fn(); S.demoMsg = okMsg; toast(okMsg); } catch (e) { S.demoMsg = "Demo: " + e.message; toast("Demo: " + e.message, "URGENT"); }
  await refreshAll(); renderView(true);
}

// ---- command palette, help, shortcuts ----
const pal = { items: [], i: 0 };
function palItems(q) {
  q = q.toLowerCase().trim();
  const views = visibleViews().map(v => ({ label: v.label, hint: "view", run: () => go(v.id) }));
  const ems = S.emergencies.map(e => ({ label: e.id, hint: (e.type || "") + " " + (e.severity || ""), run: () => { S.sel = e.id; S.tab = "summary"; go("emergencies"); } }));
  return views.concat(ems).filter(x => !q || (x.label + " " + x.hint).toLowerCase().includes(q)).slice(0, 12);
}
function palRender() {
  pal.items = palItems($("palIn").value); pal.i = Math.min(pal.i, Math.max(0, pal.items.length - 1));
  $("palList").innerHTML = pal.items.length ? pal.items.map((x, i) => '<li role="option" aria-selected="' + (i === pal.i) + '" data-i="' + i + '"><span>' + esc(x.label) + '</span><span class="note">' + esc(x.hint) + "</span></li>").join("") : '<li class="note">Nothing found</li>';
  $("palList").querySelectorAll("[data-i]").forEach(li => li.onclick = () => palRun(Number(li.dataset.i)));
}
function palRun(i) { const it = pal.items[i]; $("palette").close(); if (it) it.run(); }
function openPalette() { if (!S.token) return; $("palIn").value = ""; pal.i = 0; palRender(); $("palette").showModal(); $("palIn").focus(); }
$("palIn").oninput = () => { pal.i = 0; palRender(); };
$("palIn").onkeydown = e => {
  if (e.key === "ArrowDown") { e.preventDefault(); pal.i = Math.min(pal.i + 1, pal.items.length - 1); palRender(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); pal.i = Math.max(pal.i - 1, 0); palRender(); }
  else if (e.key === "Enter") { e.preventDefault(); palRun(pal.i); }
};
$("palette").addEventListener("click", e => { if (e.target === $("palette")) $("palette").close(); });
$("btnPalette").onclick = openPalette;
$("btnHelp").onclick = () => $("help").showModal();
$("helpClose").onclick = () => $("help").close();

document.addEventListener("keydown", e => {
  if (!S.token) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); return openPalette(); }
  if (document.querySelector("dialog[open]") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement || {}).tagName)) return;
  if (e.key === "?") return $("help").showModal();
  const n = Number(e.key), vs = visibleViews();
  if (n >= 1 && n <= vs.length) return go(vs[n - 1].id);
  if (e.key === "j" || e.key === "k") {
    const ids = S.emergencies.slice().sort((a, b) => (L.parseTime(b.created_at) || 0) - (L.parseTime(a.created_at) || 0)).map(x => x.id);
    if (!ids.length) return;
    const i = Math.max(0, ids.indexOf(S.sel)) + (e.key === "j" ? 1 : -1);
    S.sel = ids[(i + ids.length) % ids.length]; S.replay = null; loadHospitals(); refreshAll();
  }
});
