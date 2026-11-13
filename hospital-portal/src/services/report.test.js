import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildReport, reportToText, formatSeconds } from './report.js';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../data/${n}`, import.meta.url)));
const context = { hospitals: load('hospitals.json'), rankingConfig: load('ranking-config.json'), checklists: load('checklists.json'), ambulances: load('ambulances.json') };
const history = load('sample-history.json');
const byId = (id) => history.find((c) => c.emergency_id === id);

test('report for a finished heart case has hospital, why, unit, team, durations and checklist', () => {
  const r = buildReport(byId('E-0901'), context);
  assert.equal(r.hospital.id, 'H3');
  assert.equal(r.hospital.role, 'Chosen hospital');
  assert.equal(r.hospital.position, 1);
  assert.match(r.hospital.why, /Cath lab ready/);
  assert.equal(r.ambulance.id, 'AMB-2');
  assert.equal(r.ambulance.call_sign, 'Bravo 2');
  assert.equal(r.team.specialty, 'Cardiology');
  assert.equal(r.checklist.total, 6);
  assert.equal(r.checklist.done, 6);
  assert.equal(r.durations.at(-1).key, 'total');
  assert.ok(r.durations.at(-1).seconds > 0);
  assert.equal(r.notes.length, 1);
  assert.ok(r.timeline.every((t, i, a) => i === 0 || t.offset_seconds >= a[i - 1].offset_seconds));
});

test('cancelled case: no ambulance, later steps not reached, outcome says cancelled', () => {
  const r = buildReport(byId('E-0906'), context);
  assert.match(r.outcome, /Cancelled/);
  assert.equal(r.ambulance, null);
  assert.equal(r.hospital.role, 'Alerted hospital (no one acknowledged)');
  assert.equal(r.durations.find((d) => d.key === 'dispatch_to_arrival').seconds, null);
  assert.equal(r.durations.at(-1).label, 'Alert to cancelled');
  assert.equal(r.checklist.done, 0);
});

test('escalated case shows the escalation count', () => {
  assert.equal(buildReport(byId('E-0905'), context).escalations, 1);
});

test('missing pieces do not crash the builder', () => {
  const r = buildReport({ emergency_id: 'E-x', type: 'HEART', state: 'HANDOVER_DONE', status_events: [] }, {});
  assert.equal(r.hospital, null);
  assert.equal(r.timeline.length, 0);
  assert.equal(r.checklist.total, 0);
});

test('text download names the simulation and lists every section', () => {
  const text = reportToText(buildReport(byId('E-0902'), context));
  for (const word of ['SIMULATED PROTOTYPE', 'SAMPLE history', 'Emergency ID: E-0902', 'STEP DURATIONS', 'TIMELINE', 'CHECKLIST: 5 of 6', 'NOTES', 'Corridor request logged']) assert.ok(text.includes(word), word);
});

test('formatSeconds', () => {
  assert.equal(formatSeconds(null), 'Not reached');
  assert.equal(formatSeconds(45), '45 s');
  assert.equal(formatSeconds(125), '2 min 5 s');
});
