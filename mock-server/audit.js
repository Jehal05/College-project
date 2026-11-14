// Phase 9: the access log (who looked at or changed what) and GET /audit (admin only). Never stores tokens or IP addresses.
const store = require('./store');

// action examples: passport.view (QR link), passport.staff_view, hospital.availability_update. outcome: allowed | denied.
function record({ user = 'unknown', role = 'unknown', action, patient_id = null, outcome = 'allowed', reason = null, fields = [] }) {
  const row = { at: new Date().toISOString(), user, role, action, patient_id, outcome, reason, fields };
  store.accessLog.push(row);
  if (patient_id && role !== 'PATIENT' && WHAT[action]) { // tell the patient's open screen (no ids, no values)
    try { require('./simulator').broadcast({ type: 'data.accessed', emergency_id: null, state: null, timestamp: row.at, payload: { entry: entryFor(row, store.accessLog.length) } }); } catch { /* telling the patient must never break a request */ }
  }
}

// "Who saw my data": only reads by someone other than the patient (Daksh's GET /patients/{id}/access-log, CONTRACT 4.8).
const WHAT = { 'passport.view': 'passport', 'passport.staff_view': 'passport', 'family.link': 'link', 'family.checkin': 'checkin', 'responder.accept': 'volunteer' };
const KIND = { HOSPITAL_STAFF: 'hospital_desk', staff: 'hospital_desk', ADMIN: 'admin', admin: 'admin', FAMILY: 'relative', RESPONDER: 'volunteer', public: 'qr_link' };
function entryFor(row, id) {
  return { id, at: row.at, who: { kind: KIND[row.role] || 'unknown' }, what: WHAT[row.action] || 'data', action: row.action, outcome: row.outcome,
    fields: row.fields || [], reason: row.reason ? 'forbidden_role' : null };
}
function accessLog(patientId, limit = 50, before = null) {
  const rows = store.accessLog.map((r, i) => ({ r, id: i + 1 })).filter(({ r, id }) => r.patient_id === patientId && r.role !== 'PATIENT' && WHAT[r.action] && (!before || id < before)).reverse();
  return { entries: rows.slice(0, limit).map(({ r, id }) => entryFor(r, id)), more: rows.length > limit, simulated: true };
}

// Consent changes are already kept per patient; show them as audit rows too (oldest first, merged with the log).
function allRows() {
  const consent = Object.entries(store.consentChanges).flatMap(([pid, list]) => list.map((c) => ({ at: c.timestamp, user: pid, role: 'PATIENT',
    action: 'consent.change', patient_id: pid, outcome: 'allowed', reason: null, fields: [c.key] })));
  return [...store.accessLog, ...consent].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

// newest first, paged
function page(pageNo, size) {
  const rows = allRows().reverse();
  return { page: pageNo, page_size: size, total: rows.length, rows: rows.slice((pageNo - 1) * size, pageNo * size) };
}

module.exports = { record, page, accessLog };
