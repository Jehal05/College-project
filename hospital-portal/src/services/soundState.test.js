import test from 'node:test';
import assert from 'node:assert/strict';
import { soundStatus, parseEnabled, serializeEnabled, shouldPlay } from './soundState.js';

test('switched off is off, whatever the browser says', () => {
  assert.equal(soundStatus(false, 'running'), 'off');
  assert.equal(soundStatus(false, null), 'off');
});
test('switched on but not unlocked yet needs a click', () => {
  assert.equal(soundStatus(true, null), 'needs-click');
  assert.equal(soundStatus(true, 'suspended'), 'needs-click');
});
test('switched on and unlocked is on', () => assert.equal(soundStatus(true, 'running'), 'on'));
test('a closed audio context needs a click again', () => assert.equal(soundStatus(true, 'closed'), 'needs-click'));
test('the saved choice: default on, only "off" turns it off', () => {
  assert.equal(parseEnabled(null), true);
  assert.equal(parseEnabled('on'), true);
  assert.equal(parseEnabled('garbage'), true);
  assert.equal(parseEnabled('off'), false);
});
test('the choice round-trips', () => {
  assert.equal(parseEnabled(serializeEnabled(true)), true);
  assert.equal(parseEnabled(serializeEnabled(false)), false);
});
test('an alert only plays when on', () => {
  assert.equal(shouldPlay(true, 'running'), true);
  assert.equal(shouldPlay(true, 'suspended'), false);
  assert.equal(shouldPlay(false, 'running'), false);
});

import { showSoundBanner, testOutcome, isNewAlert, titleFrame } from './soundState.js';

test('the banner shows only when sound is on but blocked', () => {
  assert.equal(showSoundBanner(soundStatus(true, 'suspended')), true);
  assert.equal(showSoundBanner(soundStatus(true, null)), true);
  assert.equal(showSoundBanner(soundStatus(true, 'running')), false);
  assert.equal(showSoundBanner(soundStatus(false, 'suspended')), false);
});
test('unlocking (suspended -> running) hides the banner', () => {
  assert.equal(showSoundBanner(soundStatus(true, 'suspended')), true);
  assert.equal(showSoundBanner(soundStatus(true, 'running')), false);
});
test('a test that stays blocked is reported, never shown as a pass', () => {
  assert.equal(testOutcome('running'), 'played');
  assert.equal(testOutcome('suspended'), 'blocked');
  assert.equal(testOutcome(null), 'blocked');
  assert.equal(testOutcome('running', false), 'unsupported');
});
test('a new alert is an increase in unread count', () => {
  assert.equal(isNewAlert(0, 1), true);
  assert.equal(isNewAlert(2, 2), false);
  assert.equal(isNewAlert(3, 2), false);
  assert.equal(isNewAlert(undefined, 1), false);
});
test('tab title: blinks with the label and keeps the unread count', () => {
  assert.equal(titleFrame('HealthTwin', 2, true), '(2) NEW ALERT · HealthTwin');
  assert.equal(titleFrame('HealthTwin', 2, false), '(2) HealthTwin');
  assert.equal(titleFrame('HealthTwin', 0, false), 'HealthTwin');
  assert.equal(titleFrame('HealthTwin', 1, true, 'नया अलर्ट'), '(1) नया अलर्ट · HealthTwin');
});
