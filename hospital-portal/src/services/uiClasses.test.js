import test from 'node:test';
import assert from 'node:assert/strict';
import { cx, buttonClass, badgeClass, stateTone, toneSymbol, BUTTON_VARIANTS, BADGE_TONES } from './uiClasses.js';

test('cx joins the real names and skips the empty ones', () => {
  assert.equal(cx('a', false, null, undefined, '', 'b'), 'a b');
  assert.equal(cx(), '');
});
test('every button has a 44px target and a visible focus ring, and an unknown variant falls back to primary', () => {
  for (const v of Object.keys(BUTTON_VARIANTS)) {
    const c = buttonClass(v);
    assert.match(c, /min-h-11/);
    assert.match(c, /focus-visible:ring-4/);
  }
  assert.ok(buttonClass('nope').includes(BUTTON_VARIANTS.primary));
  assert.ok(buttonClass('secondary', 'w-full').endsWith('w-full'));
});
test('badge tones fall back to neutral', () => {
  assert.ok(badgeClass('nope').includes(BADGE_TONES.neutral));
  assert.ok(badgeClass('danger').includes(BADGE_TONES.danger));
});
test('state tone: unacknowledged is danger, done is success, cancelled and early are neutral, the rest info', () => {
  assert.equal(stateTone('SOS_SENT'), 'danger');
  assert.equal(stateTone('ESCALATED'), 'danger');
  assert.equal(stateTone('HANDOVER_DONE'), 'success');
  assert.equal(stateTone('CANCELLED'), 'neutral');
  assert.equal(stateTone('MONITORING'), 'neutral');
  assert.equal(stateTone('EN_ROUTE'), 'info');
  assert.equal(stateTone(undefined), 'info');
});
test('every tone has its own text symbol', () => {
  const symbols = Object.keys(BADGE_TONES).map(toneSymbol);
  assert.equal(new Set(symbols).size, symbols.length);
  assert.equal(toneSymbol('x'), toneSymbol('neutral'));
});
