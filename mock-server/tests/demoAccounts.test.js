// Run: node --test tests/   (no internet, no hardware)
const test = require('node:test');
const assert = require('node:assert');
const { passwordMatches, accounts } = require('../demoAccounts');
const store = require('../store');

test('five demo patients, one per patient id, hash only in the user record', () => {
  const list = accounts();
  assert.strictEqual(list.length, 5);
  assert.strictEqual(new Set(list.map((a) => a.patient_id)).size, 5);
  for (const a of list) {
    const u = store.users.find((x) => x.email === a.email);
    assert.ok(u && u.pwHash && u.salt);
    assert.strictEqual(u.password, undefined);
    assert.ok(passwordMatches(u, a.password));
    assert.ok(!passwordMatches(u, a.password + 'x'));
    assert.ok(store.patients[a.patient_id], 'patient exists');
  }
});

test('passwords differ per account and the old fixed login still works', () => {
  assert.strictEqual(new Set(accounts().map((a) => a.password)).size, 5);
  const fixed = store.users.find((u) => u.email === 'patient@demo.test');
  assert.ok(passwordMatches(fixed, 'demo1234'));
});

test('names match the five demo patients', () => {
  const names = accounts().map((a) => store.patients[a.patient_id].name).sort();
  assert.deepStrictEqual(names, ['Amit Verma', 'Neha Kapoor', 'Priya Singh', 'Rahul Sharma', 'Rohan Mehta']);
});
