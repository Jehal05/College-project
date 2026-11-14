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
