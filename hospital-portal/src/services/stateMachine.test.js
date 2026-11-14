// Run with: npm test   (uses Node's built-in test runner, no extra packages)
import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, canCancel, isFinal, nextStates, whyNot, TRANSITIONS } from './stateMachine.js';

const HAPPY_PATH = ['SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE'];

test('the full happy path is allowed step by step', () => {
  for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
    assert.ok(canTransition(HAPPY_PATH[i], HAPPY_PATH[i + 1]), `${HAPPY_PATH[i]} -> ${HAPPY_PATH[i + 1]}`);
  }
});

test('skipping a step is not allowed', () => {
  assert.equal(canTransition('SOS_SENT', 'AMBULANCE_DISPATCHED'), false);
  assert.equal(canTransition('SOS_SENT', 'ARRIVED'), false);
  assert.equal(canTransition('HOSPITAL_ACKNOWLEDGED', 'ARRIVED'), false);
  assert.equal(canTransition('AMBULANCE_DISPATCHED', 'HANDOVER_DONE'), false);
});

test('going backwards or repeating a step is not allowed', () => {
  assert.equal(canTransition('ARRIVED', 'EN_ROUTE'), false);
  assert.equal(canTransition('HOSPITAL_ACKNOWLEDGED', 'HOSPITAL_ACKNOWLEDGED'), false);
  assert.equal(canTransition('AMBULANCE_DISPATCHED', 'HOSPITAL_ACKNOWLEDGED'), false);
});

test('a cancelled emergency can never be acknowledged or dispatched', () => {
  assert.deepEqual(nextStates('CANCELLED'), []);
  for (const to of Object.keys(TRANSITIONS)) assert.equal(canTransition('CANCELLED', to), false);
});

test('HANDOVER_DONE and CANCELLED are final', () => {
  assert.ok(isFinal('HANDOVER_DONE'));
  assert.ok(isFinal('CANCELLED'));
  assert.equal(isFinal('EN_ROUTE'), false);
  assert.deepEqual(nextStates('HANDOVER_DONE'), []);
});

test('an escalated alert can still be acknowledged, and nothing else', () => {
  assert.ok(canTransition('ESCALATED', 'HOSPITAL_ACKNOWLEDGED'));
  assert.equal(canTransition('ESCALATED', 'AMBULANCE_DISPATCHED'), false);
});

test('the patient can cancel only before dispatch', () => {
  assert.ok(canCancel('SOS_SENT'));
  assert.ok(canCancel('ESCALATED'));
  assert.ok(canCancel('HOSPITAL_ACKNOWLEDGED'));
  assert.equal(canCancel('AMBULANCE_DISPATCHED'), false);
  assert.equal(canCancel('EN_ROUTE'), false);
  assert.equal(canCancel('CANCELLED'), false);
});

test('unknown states allow nothing', () => {
  assert.deepEqual(nextStates('NOT_A_STATE'), []);
  assert.equal(canTransition('MONITORING', 'HOSPITAL_ACKNOWLEDGED'), false);
});

test('whyNot explains a disabled button and is empty for an allowed one', () => {
  assert.equal(whyNot('SOS_SENT', 'HOSPITAL_ACKNOWLEDGED'), '');
  assert.match(whyNot('SOS_SENT', 'AMBULANCE_DISPATCHED'), /Acknowledge/);
  assert.match(whyNot('EN_ROUTE', 'HOSPITAL_ACKNOWLEDGED'), /already done/);
  assert.match(whyNot('CANCELLED', 'AMBULANCE_DISPATCHED'), /cancelled/);
  assert.match(whyNot('HANDOVER_DONE', 'ARRIVED'), /finished/);
});
