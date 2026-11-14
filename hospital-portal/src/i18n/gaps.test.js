// Strings found by the full-page language check (every route in en, hi, gu): warnings, Report page, audit log, hospital panel, roles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from './translate.js';
import { warningText, roleText, activityText } from './phrases.js';
import { buildActivity } from '../services/activity.js';
import { reviewBadge } from '../services/review.js';
import { readinessWarnings, cardWarning, cardWarningCode } from '../services/capacity.js';
import { REQUIRED_CAPABILITIES } from '../services/contract.js';
import { buildReport } from '../services/report.js';

const tr = (lang) => (key, vars) => translate(lang, key, vars);
const hospitals = [
  { id: 'H', name: 'H', capabilities: { cath_lab: false, stroke_unit: false, icu: false, emergency: false }, availability: { ready: false } },
  { id: 'H', name: 'H', capabilities: { cath_lab: true, stroke_unit: true, icu: true, emergency: true }, availability: { cath_lab_ready: false, stroke_unit_ready: false, icu_free: 0 } },
  { id: 'H', name: 'H', capabilities: { cath_lab: true, stroke_unit: true, icu: true, emergency: true }, availability: {} },
];
const all = new Map();
for (const type of Object.keys(REQUIRED_CAPABILITIES)) for (const h of hospitals) for (const w of readinessWarnings({ emergency_id: 'E', type }, h)) all.set(w.code, w.text);

test('every readiness warning code has a sentence in en, hi and gu', () => {
  assert.equal(all.size, 11, [...all.keys()].join(','));
  for (const [code, text] of all) {
    assert.equal(translate('en', `warn.c.${code}`), text, `en warn.c.${code}`);
    assert.equal(warningText(tr('en'), { code, text }), text);
    for (const l of ['hi', 'gu']) assert.notEqual(translate(l, `warn.c.${code}`), text, `${l} warn.c.${code} is still English`);
  }
});
test('the alert card warning keeps its English wording, and hi/gu have a sentence per code', () => {
  let seen = 0;
  for (const type of Object.keys(REQUIRED_CAPABILITIES)) {
    for (const h of hospitals) {
      const e = { emergency_id: 'E', type };
      const short = cardWarning(e, h);
      if (!short) continue;
      seen += 1;
      const code = cardWarningCode(e, h);
      assert.equal(translate('en', `warn.card.${code}`), `Warning: your ${short}`);
      for (const l of ['hi', 'gu']) assert.notEqual(translate(l, `warn.card.${code}`), `Warning: your ${short}`);
    }
  }
  assert.ok(seen > 0);
});
test('an unknown warning code keeps its English text', () => assert.equal(warningText(tr('hi'), { code: 'zzz', text: 'Some text.' }), 'Some text.'));
test('roles: staff and admin are translated, anything else stays', () => {
  assert.equal(roleText(tr('en'), 'staff'), 'staff');
  assert.notEqual(roleText(tr('hi'), 'staff'), 'staff');
  assert.notEqual(roleText(tr('gu'), 'admin'), 'admin');
  assert.equal(roleText(tr('hi'), 'crew'), 'crew');
});
test('the report gives a key for the outcome and hospital role, and the English text is unchanged', () => {
  const base = { emergency_id: 'E1', type: 'HEART', created_at: '2026-11-14T10:00:00Z', alerted_hospital_id: 'H', status_events: [{ state: 'SOS_SENT', timestamp: '2026-11-14T10:00:00Z' }, { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: '2026-11-14T10:01:00Z' }] };
  const hs = [{ id: 'H', name: 'H', capabilities: {}, availability: {} }];
  const open = buildReport({ ...base, state: 'HOSPITAL_ACKNOWLEDGED' }, { hospitals: hs });
  assert.equal(open.outcome_key, 'open');
  assert.equal(open.outcome, 'Still open (not finished)');
  assert.equal(open.hospital.role_key, 'chosen');
  assert.equal(buildReport({ ...base, state: 'HANDOVER_DONE' }, { hospitals: hs }).outcome, 'Handed over to the hospital team');
  assert.equal(buildReport({ ...base, state: 'CANCELLED' }, { hospitals: hs }).outcome_key, 'cancelled');
  assert.equal(buildReport({ ...base, state: 'CANCELLED', status_events: [] }, { hospitals: hs }).outcome_key, 'cancelledEarly');
  assert.equal(buildReport({ ...base, state: 'SOS_SENT', status_events: [base.status_events[0]] }, { hospitals: hs }).hospital.role_key, 'alerted');
  for (const k of ['cancelledEarly', 'cancelled', 'handed', 'open']) for (const l of ['hi', 'gu']) assert.notEqual(translate(l, `rp.o.${k}`), translate('en', `rp.o.${k}`));
});
test('the new screen texts are translated (not left as English) in hi and gu', () => {
  const keep = new Set(['tk.sim', 'rc.sim', 'admin.int.sw2']); // contain the word "simulated" on purpose, or a short word
  const keys = Object.keys({}).concat(
    ['rp.title', 'rp.sample', 'rp.patientId', 'rp.type', 'rp.alertTime', 'rp.outcome', 'rp.ranked', 'rp.reasonNote', 'rp.noHospital', 'rp.escalations', 'rp.noneSent', 'rp.team', 'rp.noneAssigned', 'rp.durations', 'rp.notReached', 'rp.total', 'rp.totalCancelled', 'rp.timeline', 'rp.sampleChecklist', 'rp.noHandover', 'rp.deskNotes', 'rp.notes', 'rp.noNotes', 'rp.dlTxt', 'rp.dlCsv', 'rp.back', 'rp.notFound',
      'aud.title', 'aud.admin', 'aud.empty', 'aud.time', 'aud.user', 'aud.action', 'aud.patient', 'aud.outcome', 'aud.fields', 'aud.denied', 'aud.note', 'fleet.sampleNote',
      'hd.capabilities', 'hd.availability', 'hd.bedsFree', 'hd.icuFree', 'hd.cathReady', 'hd.strokeReady', 'common.yes', 'common.no', 'common.close', 'common.refresh',
      'team.assigned', 'team.nobody', 'team.lockedCancelled', 'team.lockedDone', 'team.suggested', 'team.assigning', 'team.change', 'team.assign', 'team.sample',
      'ck.readOnly', 'ck.tickedBy', 'ck.staff', 'tl.none', 'map.noLocation', 'map.middle', 'map.zoomIn', 'map.zoomOut', 'admin.int.sw1', 'admin.int.sw3'],
  ).filter((k) => !keep.has(k));
  for (const k of keys) for (const l of ['hi', 'gu']) assert.notEqual(translate(l, k, { id: 'X', who: 'a', time: 'b', pos: 1, of: 2, total: 3 }), translate('en', k, { id: 'X', who: 'a', time: 'b', pos: 1, of: 2, total: 3 }), `${l} ${k} is still English`);
});

test('Activity rows: English text is unchanged, hi/gu translate the status and the Ticked word, and case data stays', () => {
  const cases = [{ emergency_id: 'E1', type: 'HEART', created_at: '2026-11-14T10:00:00Z', checklist: { 'chk-1': { done: true, by: 'Asha', at: '2026-11-14T10:05:00Z' } },
    status_events: [{ state: 'HOSPITAL_ACKNOWLEDGED', timestamp: '2026-11-14T10:01:00Z' }, { state: 'NOTE', kind: 'desk', note: 'Bay 2 ready', timestamp: '2026-11-14T10:02:00Z', actor: 'Asha' }] }];
  const rows = buildActivity(cases);
  const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
  for (const r of rows) assert.equal(activityText(tr('en'), r), r.text, `en ${r.kind}`);
  assert.notEqual(activityText(tr('hi'), byKind.state), byKind.state.text);
  assert.notEqual(activityText(tr('gu'), byKind.state), byKind.state.text);
  assert.ok(activityText(tr('hi'), byKind.note).endsWith(': Bay 2 ready'));
  assert.ok(!activityText(tr('hi'), byKind.note).startsWith('Desk note'));
  assert.notEqual(activityText(tr('gu'), byKind.checklist).split(':')[0], 'Ticked');
});
test('review badge: English unchanged, hi/gu translated, never claims a review that did not happen', () => {
  const draft = [{ id: 'a', text: 'x', status: 'draft' }];
  const part = [{ id: 'a', text: 'x', status: 'reviewed', reviewed_by: 'Dr A', reviewed_on: '2026-11-01' }, { id: 'b', text: 'y', status: 'draft' }];
  const done = [part[0]];
  for (const items of [draft, part, done]) {
    assert.equal(reviewBadge(items, tr('en')), reviewBadge(items));
    for (const l of ['hi', 'gu']) assert.notEqual(reviewBadge(items, tr(l)), reviewBadge(items), `${l} ${items.length}`);
  }
  assert.ok(reviewBadge(done, tr('hi')).includes('Dr A') && reviewBadge(done, tr('hi')).includes('2026-11-01'));
  assert.ok(reviewBadge(part, tr('gu')).includes('1') && reviewBadge(part, tr('gu')).includes('2'));
});
