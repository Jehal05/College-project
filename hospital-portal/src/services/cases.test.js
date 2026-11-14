import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mergeCases, filterCases, caseKey } from './cases.js';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../data/${n}`, import.meta.url)));
const history = load('sample-history.json');
const hospitals = load('hospitals.json');

test('merge: the version with more timeline events wins, newest case first', () => {
  const stored = [{ emergency_id: 'E-1', created_at: '2026-11-12T10:00:00Z', state: 'HANDOVER_DONE', status_events: [{}, {}, {}] }];
  const live = [{ emergency_id: 'E-1', created_at: '2026-11-12T10:00:00Z', state: 'SOS_SENT', status_events: [{}] }, { emergency_id: 'E-2', created_at: '2026-11-13T10:00:00Z', state: 'SOS_SENT', status_events: [{}] }];
  const out = mergeCases(stored, live);
  assert.deepEqual(out.map((e) => e.emergency_id), ['E-2', 'E-1']);
  assert.equal(out[1].state, 'HANDOVER_DONE');
});

test('merge: the same id with a different alert time is a different case', () => {
  const a = { emergency_id: 'E-1001', created_at: '2026-11-12T10:00:00Z', status_events: [{}] };
  const b = { emergency_id: 'E-1001', created_at: '2026-11-13T10:00:00Z', status_events: [{}] };
  assert.notEqual(caseKey(a), caseKey(b));
  assert.equal(mergeCases([a], [b]).length, 2);
});

test('filters: default shows finished cases only', () => {
  assert.equal(filterCases(history, {}, hospitals).length, 7);
  assert.equal(filterCases([...history, { emergency_id: 'E-9', created_at: '2026-11-13T10:00:00Z', state: 'SOS_SENT' }], {}, hospitals).length, 7);
  assert.equal(filterCases([{ emergency_id: 'E-9', created_at: '2026-11-13T10:00:00Z', state: 'SOS_SENT' }], { state: 'all' }, hospitals).length, 1);
});

test('filters: type, severity, state and hospital', () => {
  assert.deepEqual(filterCases(history, { type: 'HEART' }, hospitals).map((e) => e.emergency_id).sort(), ['E-0901', 'E-0905']);
  assert.equal(filterCases(history, { severity: 'URGENT' }, hospitals).length, 3);
  assert.deepEqual(filterCases(history, { state: 'CANCELLED' }, hospitals).map((e) => e.emergency_id), ['E-0906']);
  assert.ok(filterCases(history, { hospital: 'H3' }, hospitals).every((e) => e.alerted_hospital_id === 'H3'));
});

test('filters: search by id, patient, hospital name or symptom', () => {
  assert.deepEqual(filterCases(history, { text: 'e-0903' }, hospitals).map((e) => e.emergency_id), ['E-0903']);
  assert.deepEqual(filterCases(history, { text: 'p-804' }, hospitals).map((e) => e.emergency_id), ['E-0904']);
  assert.ok(filterCases(history, { text: 'slurred' }, hospitals).length === 2);
  assert.ok(filterCases(history, { text: 'sabarmati' }, hospitals).length >= 1);
  assert.equal(filterCases(history, { text: 'zzz' }, hospitals).length, 0);
});

test('filters: date range uses whole days and includes both ends', () => {
  assert.equal(filterCases(history, { from: '2026-11-12', to: '2026-11-12' }, hospitals).length, 7);
  assert.equal(filterCases(history, { from: '2026-11-13' }, hospitals).length, 0);
  assert.equal(filterCases(history, { to: '2026-11-11' }, hospitals).length, 0);
});
