import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, csvText, casesToCsv, timelineToCsv, BOM, CASE_COLUMNS } from './csv.js';

test('cells: quotes, commas and line breaks are quoted; empty values are empty', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(NaN), '');
  assert.equal(csvCell(12), '12');
  assert.equal(csvCell(-3), '-3'); // a real number is not text, so no prefix
});

test('text that a spreadsheet could run as a formula gets a leading apostrophe', () => {
  for (const bad of ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\tx']) assert.ok(csvCell(bad).startsWith("'"), bad);
  assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
});

test('the file starts with a BOM (Excel reads Hindi and Gujarati) and uses CRLF', () => {
  const out = csvText([['a', 'b'], ['1', '2']]);
  assert.equal(out.charCodeAt(0), 0xfeff);
  assert.ok(out.startsWith(`${BOM}a,b\r\n1,2\r\n`));
  assert.ok(csvText([['गुजरात']]).includes('गुजरात'));
});

const finished = {
  emergency_id: 'E-1', patient_id: 'P-9', created_at: '2026-11-14T10:00:00.000Z', type: 'HEART', severity: 'EMERGENCY',
  state: 'HANDOVER_DONE', alerted_hospital_id: 'h1', sample: false,
  status_events: [
    { state: 'SOS_SENT', timestamp: '2026-11-14T10:00:00.000Z' },
    { state: 'ESCALATED', timestamp: '2026-11-14T10:00:30.000Z' },
    { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: '2026-11-14T10:01:00.000Z' },
    { state: 'HANDOVER_DONE', timestamp: '2026-11-14T10:20:00.000Z' },
  ],
};

test('cases: one header row, one row per case, hospital name and numbers filled', () => {
  const lines = casesToCsv([finished, { ...finished, emergency_id: '=E-2', patient_id: null, alerted_hospital_id: null, sample: true }], (id) => `Hospital ${id}`)
    .slice(1).trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], CASE_COLUMNS.join(','));
  assert.match(lines[1], /^E-1,P-9,2026-11-14T10:00:00.000Z,Heart attack,EMERGENCY,Hospital h1,HANDOVER_DONE,1200,1,no$/);
  assert.match(lines[2], /^'=E-2,,.*,,HANDOVER_DONE,1200,1,yes$/); // formula guard, empty patient and hospital
  assert.equal(casesToCsv([]).slice(1).trim(), CASE_COLUMNS.join(','));
});

test('timeline: rows are in time order and notes keep their commas safe', () => {
  const csv = timelineToCsv([
    { state: 'NOTE', timestamp: '2026-11-14T10:05:00.000Z', actor: 'Desk', note: 'Bed 4, ready' },
    { state: 'SOS_SENT', timestamp: '2026-11-14T10:00:00.000Z' },
  ]).slice(1).trim().split('\r\n');
  assert.equal(csv[1], '2026-11-14T10:00:00.000Z,SOS_SENT,,');
  assert.equal(csv[2], '2026-11-14T10:05:00.000Z,NOTE,Desk,"Bed 4, ready"');
});
