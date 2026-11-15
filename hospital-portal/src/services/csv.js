// CSV export (Excel-friendly). Pure: the pages only turn the text into a download.
//  - cells with a comma, quote or line break are quoted
//  - a text cell that starts with = + - @ is prefixed with ' so a spreadsheet never runs it as a formula
//  - the file starts with a BOM, so Excel reads Hindi and Gujarati text correctly
import { TYPE_LABELS } from './contract.js';
import { stepDurations, escalationCount } from './analytics.js';

export const BOM = '﻿';

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'number' ? (Number.isFinite(value) ? String(value) : '') : String(value);
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvText = (rows) => BOM + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';

export const CASE_COLUMNS = ['Case ID', 'Patient ID', 'Created (ISO time)', 'Type', 'Severity', 'Hospital', 'State', 'Total time (seconds)', 'Escalations', 'Sample case'];

/** One row per case, in the order given (the History page passes the filtered list). */
export function casesToCsv(cases, hospitalName = (id) => id) {
  const rows = (cases || []).map((e) => [
    e.emergency_id,
    e.patient_id ?? '',
    e.created_at ?? '',
    TYPE_LABELS[e.type] || e.type || '',
    e.severity ?? '',
    e.alerted_hospital_id ? hospitalName(e.alerted_hospital_id) : '',
    e.state ?? '',
    stepDurations(e).total ?? '',
    escalationCount(e),
    e.sample ? 'yes' : 'no',
  ]);
  return csvText([CASE_COLUMNS, ...rows]);
}

export const TIMELINE_COLUMNS = ['Time (ISO)', 'State', 'By', 'Note'];

/** The timeline of one case: one row per step or note. */
export function timelineToCsv(events) {
  const rows = [...(events || [])]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((x) => [x.timestamp ?? '', x.state ?? '', x.actor ?? '', x.note ?? '']);
  return csvText([TIMELINE_COLUMNS, ...rows]);
}

/**
 * Analytics numbers as CSV. Totals and times only: no case or patient ids, no names.
 * The first rows say the data is simulated and which dates were chosen.
 */
export function analyticsToCsv(summary, spreads, { from = '', to = '', stepLabel = (k) => k, generated = new Date().toISOString() } = {}) {
  const sec = (v) => (v === null || v === undefined ? '' : v);
  const rows = [
    ['HealthTwin AI analytics (Simulated data: not real patients)'],
    ['Generated (ISO time)', generated],
    ['From', from || 'all'],
    ['To', to || 'all'],
    [],
    ['Section', 'Metric', 'Value'],
    ['Cases', 'Total', summary.total],
    ['Cases', 'Still open', summary.open],
    ['Cases', 'Handed over', summary.finished],
    ['Cases', 'Cancelled', summary.cancelled],
    ['Cases', 'Escalated cases', summary.escalations.cases],
    [],
    ['Step', 'Cases (n)', 'Average (s)', 'Median (s)', 'P90 (s)'],
  ];
  for (const key of Object.keys(spreads)) {
    const s = spreads[key];
    rows.push([stepLabel(key), s.n, sec(s.average), sec(s.median), sec(s.p90)]);
  }
  return csvText(rows);
}
