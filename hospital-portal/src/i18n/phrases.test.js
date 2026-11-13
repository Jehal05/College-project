import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from './translate.js';
import { stateText, stepText, actionText, capText } from './phrases.js';

const tr = (lang) => (key, vars) => translate(lang, key, vars);

test('English gives exactly the old labels', () => {
  assert.equal(stateText(tr('en'), 'HOSPITAL_ACKNOWLEDGED'), 'Acknowledged · no ambulance dispatched yet');
  assert.equal(stateText(tr('en'), 'ESCALATED'), 'Escalated to the next hospital · not acknowledged yet');
  assert.equal(actionText(tr('en'), 'AMBULANCE_DISPATCHED', 'Dispatch'), 'Dispatch');
  assert.equal(capText(tr('en'), 'Ready'), 'Ready');
  assert.equal(capText(tr('en'), 'Not shared'), 'Not shared');
});

test('Hindi and Gujarati give their own words, numbers pass through', () => {
  assert.notEqual(stateText(tr('hi'), 'SOS_SENT'), stateText(tr('en'), 'SOS_SENT'));
  assert.notEqual(stateText(tr('gu'), 'ARRIVED'), stateText(tr('en'), 'ARRIVED'));
  assert.notEqual(capText(tr('hi'), 'Not ready'), 'Not ready');
  assert.equal(capText(tr('gu'), '11'), '11');
});

test('unknown states and steps fall back to English, never to a raw key', () => {
  assert.equal(stateText(tr('hi'), 'SOMETHING_NEW'), 'SOMETHING_NEW');
  assert.equal(stepText(tr('hi'), 'MONITORING', 'Monitoring'), 'Monitoring');
  assert.equal(actionText(tr('gu'), 'NOPE', 'Nope'), 'Nope');
});

test('every real state has a translation in all three languages', () => {
  for (const lang of ['en', 'hi', 'gu']) {
    for (const s of ['EMERGENCY_DETECTED', 'SOS_SENT', 'ESCALATED', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE', 'CANCELLED']) {
      assert.notEqual(tr(lang)(`state.${s}`), `state.${s}`, `${lang} ${s}`);
    }
  }
});
