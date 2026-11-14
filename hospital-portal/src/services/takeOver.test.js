import test from 'node:test';
import assert from 'node:assert/strict';
import { needsTakeOver, checkReason, takeOverNote, takeOverFields, defaultReason } from './takeOver.js';

const alert = (over = {}) => ({ emergency_id: 'E1', state: 'SOS_SENT', alerted_hospital_id: 'H1', ...over });

test('an alert at another hospital needs a take-over', () => assert.equal(needsTakeOver(alert(), 'H2'), true));
test('an alert at my hospital does not', () => assert.equal(needsTakeOver(alert(), 'H1'), false));
test('an alert with no hospital yet does not', () => assert.equal(needsTakeOver(alert({ alerted_hospital_id: null }), 'H2'), false));
test('finished, cancelled and early alerts do not', () => {
  assert.equal(needsTakeOver(alert({ state: 'HANDOVER_DONE' }), 'H2'), false);
  assert.equal(needsTakeOver(alert({ state: 'CANCELLED' }), 'H2'), false);
  assert.equal(needsTakeOver(alert({ state: 'EMERGENCY_DETECTED' }), 'H2'), false);
});
test('after the take-over the desk is not asked again', () => {
  const a = alert();
  assert.equal(needsTakeOver({ ...a, ...takeOverFields('H2', a) }, 'H2'), false);
});
test('if the alert moves on to another hospital, a new take-over is needed', () => {
  const a = alert();
  const taken = { ...a, ...takeOverFields('H2', a) };
  assert.equal(needsTakeOver({ ...taken, alerted_hospital_id: 'H3' }, 'H2'), true);
});
test('a take-over by another desk does not count for me', () => assert.equal(needsTakeOver(alert({ taken_over_by: 'H9', taken_over_from: 'H1' }), 'H2'), true));
test('ids are compared as text', () => assert.equal(needsTakeOver(alert({ alerted_hospital_id: 1 }), '1'), false));
test('a reason must be chosen; "other" needs text', () => {
  assert.equal(checkReason('', '').ok, false);
  assert.equal(checkReason('nonsense', '').ok, false);
  assert.equal(checkReason('other', '   ').ok, false);
  assert.equal(checkReason('other', 'Phone call from the family').ok, true);
});
test('a chosen reason works with or without extra text', () => {
  const labels = { demo: 'Demo or training' };
  assert.equal(checkReason('demo', '', labels).reason, 'Demo or training');
  assert.equal(checkReason('demo', 'rehearsal', labels).reason, 'Demo or training: rehearsal');
});
test('a very long reason is refused', () => assert.equal(checkReason('other', 'x'.repeat(201)).ok, false));
test('the note names the old hospital and the reason', () => {
  assert.equal(takeOverNote('City Care', 'Demo'), 'Taken over from City Care. Reason: Demo');
  assert.match(takeOverNote(null, 'x'), /another hospital/);
});
test('one click in mock mode, a real choice in real mode', () => {
  assert.equal(defaultReason(true), 'demo');
  assert.equal(defaultReason(false), '');
});
