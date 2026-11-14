// Plain logic behind the Overview screen. Nothing here guesses at medical meaning: it counts what is present and compares readings
// with the person's own usual ranges (the same rule as the digital twin bar).

export const ITEMS = ['profile', 'contacts', 'reports', 'baseline', 'reminders', 'vitals'];

// How complete the twin's data is: the share of ITEMS that exist. `missing` lists the ones that do not.
export function completeness({ patient, contacts, reports, baseline, reminders, vitals } = {}) {
  const has = {
    profile: Boolean(patient && patient.blood_group && patient.allergies && patient.conditions && patient.medications),
    contacts: Array.isArray(contacts) && contacts.length > 0,
    reports: Array.isArray(reports) && reports.length > 0,
    baseline: Boolean(baseline),
    reminders: Array.isArray(reminders) && reminders.length > 0,
    vitals: Boolean(vitals),
  };
  const missing = ITEMS.filter((k) => !has[k]);
  return { percent: Math.round(((ITEMS.length - missing.length) / ITEMS.length) * 100), missing, has };
}

// Rows from twinRows() turned into observations. Rows without a reading are skipped.
export const observations = (rows) => rows.filter((r) => r.within !== null).map((r) => ({ key: r.key, within: r.within }));

export const stats = (values) => (values.length
  ? { latest: values[values.length - 1], min: Math.min(...values), max: Math.max(...values), count: values.length } : null);

// The soonest upcoming reminder slots across all reminders, earliest first. `next` comes from reminderSchedule.nextDue.
export function upcoming(reminders, now, nextDue, limit = 3) {
  return reminders
    .map((r) => ({ id: r.id, name: r.name, at: nextDue(r, now) }))
    .filter((x) => x.at)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
}

// "120/80" from either payload shape the server may send ("bp" text, or bp_sys and bp_dia numbers). null when there is no reading.
export function bpText(v) {
  if (!v) return null;
  if (typeof v.bp === 'string' && /^\d+\/\d+$/.test(v.bp)) return v.bp;
  return Number.isFinite(v.bp_sys) && Number.isFinite(v.bp_dia) ? v.bp_sys + '/' + v.bp_dia : null;
}
