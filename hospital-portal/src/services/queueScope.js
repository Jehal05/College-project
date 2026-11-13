// Which alerts does THIS desk see? Pure functions, no React (tests: queueScope.test.js).
//   scope 'mine' : alerts held by this hospital, plus alerts with no hospital yet (an alert is never lost)
//   scope 'all'  : every alert (demo view)
// The hospital id is compared as text, so any id style works.

export const SCOPES = ['mine', 'all'];

/** Real mode starts on "My hospital". Mock mode starts on "All hospitals" so the sample alerts are visible. */
export const defaultScope = (useMock) => (useMock ? 'all' : 'mine');

const same = (a, b) => String(a) === String(b);

/** Is this alert held by another hospital than ours? (No hospital yet = not "another".) */
export const isElsewhere = (alert, hospitalId) => Boolean(alert?.alerted_hospital_id) && hospitalId != null && !same(alert.alerted_hospital_id, hospitalId);

export function inScope(alert, hospitalId, scope) {
  if (scope === 'all') return true;
  return !isElsewhere(alert, hospitalId);
}

export const scopeList = (list, hospitalId, scope) => list.filter((e) => inScope(e, hospitalId, scope));

/** Open alerts the desk does not see in "My hospital" (finished and cancelled ones are not counted). */
export const hiddenCount = (list, hospitalId, scope) =>
  scope === 'all' ? 0 : list.filter((e) => isElsewhere(e, hospitalId) && !['HANDOVER_DONE', 'CANCELLED'].includes(e.state)).length;

/** "now at <hospital name>" for an alert held elsewhere, else null. */
export function elsewhereLabel(alert, hospitalId, hospitals = []) {
  if (!isElsewhere(alert, hospitalId)) return null;
  const name = alert.alerted_hospital_name || hospitals.find((h) => same(h.id, alert.alerted_hospital_id))?.name || String(alert.alerted_hospital_id);
  return `now at ${name}`;
}
