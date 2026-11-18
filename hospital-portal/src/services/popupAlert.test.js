import test from 'node:test';
import assert from 'node:assert/strict';
import { popupFor } from './popupAlert.js';

const loud = { id: 5, text: 'New emergency: heart', politeness: 'assertive' };
test('a loud announcement pops up only when the tab is hidden and permission is granted', () => {
  assert.equal(popupFor(loud, { hidden: true, permission: 'granted' }).body, 'New emergency: heart');
  assert.equal(popupFor(loud, { hidden: false, permission: 'granted' }), null);
  assert.equal(popupFor(loud, { hidden: true, permission: 'default' }), null);
  assert.equal(popupFor(loud, { hidden: true, permission: 'denied' }), null);
});
test('quiet announcements and repeats do not pop up', () => {
  assert.equal(popupFor({ ...loud, politeness: 'polite' }, { hidden: true, permission: 'granted' }), null);
  assert.equal(popupFor(loud, { hidden: true, permission: 'granted', lastId: 5 }), null);
  assert.equal(popupFor(null, { hidden: true, permission: 'granted' }), null);
});
test('the pop-up is labelled DEMO', () => {
  assert.match(popupFor(loud, { hidden: true, permission: 'granted' }).title, /DEMO/);
});
