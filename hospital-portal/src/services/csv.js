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
