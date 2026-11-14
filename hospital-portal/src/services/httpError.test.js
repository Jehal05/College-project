import test from 'node:test';
import assert from 'node:assert/strict';
import { isSessionExpired, messageFromBody, failureText } from './httpError.js';

test('401 on a normal call means the session expired', () => assert.equal(isSessionExpired(401, '/emergencies?status=active'), true));
test('401 on the login call is a wrong password, not an expiry', () => assert.equal(isSessionExpired(401, '/auth/login'), false));
test('other statuses are not an expiry', () => {
  assert.equal(isSessionExpired(403, '/audit'), false);
  assert.equal(isSessionExpired(500, '/x'), false);
});
test('message is read from the common body shapes', () => {
  assert.equal(messageFromBody({ error: 'Hospital not found' }), 'Hospital not found');
  assert.equal(messageFromBody({ message: 'Bad value' }), 'Bad value');
  assert.equal(messageFromBody({ detail: 'Nope' }), 'Nope');
  assert.equal(messageFromBody({ error: { message: 'Deep' } }), 'Deep');
});
test('empty, odd or HTML bodies give no message', () => {
  assert.equal(messageFromBody(null), '');
  assert.equal(messageFromBody({}), '');
  assert.equal(messageFromBody({ error: 42 }), '');
  assert.equal(messageFromBody('<html>Bad gateway</html>'), '');
});
test('a token in the message is hidden and a long message is cut', () => {
  assert.ok(!messageFromBody({ error: 'bad Bearer abc.def.ghi' }).includes('abc.def'));
  assert.ok(messageFromBody({ error: 'x'.repeat(500) }).length <= 160);
});
test('failureText uses the server message, else the old text', () => {
  assert.equal(failureText('POST', '/a', 400, 'Beds must be 0 or more'), 'Beds must be 0 or more (400)');
  assert.equal(failureText('POST', '/a', 500), 'POST /a failed: 500');
});
