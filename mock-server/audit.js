// Phase 9: the access log (who looked at or changed what) and GET /audit (admin only). Never stores tokens or IP addresses.
const store = require('./store');

// action examples: passport.view (QR link), passport.staff_view, hospital.availability_update. outcome: allowed | denied.
function record({ user = 'unknown', role = 'unknown', action, patient_id = null, outcome = 'allowed', reason = null, fields = [] }) {
  store.accessLog.push({ at: new Date().toISOString(), user, role, action, patient_id, outcome, reason, fields });
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

module.exports = { record, page };
