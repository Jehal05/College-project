import test from 'node:test';
import assert from 'node:assert/strict';
import { announcementFor } from './announce.js';
import { applyEvent, shouldAlertSound, countUnread } from './emergencyReducer.js';

const ctx = { hospitalId: 'h1', scope: 'mine', selectedId: null };
const created = (id, state, extra = {}) => ({ event: 'emergency.created', emergency_id: id, state, timestamp: '2026-11-13T08:00:00Z', received_at: 1000, payload: { type: 'HEART', severity: 'EMERGENCY', patient_id: 'pat_001', alerted_hospital_id: 'h1', ...extra } });

test('a new EMERGENCY is announced assertively with the type and patient', () => {
  const a = announcementFor([], created('E1', 'SOS_SENT'), ctx);
  assert.equal(a.politeness, 'assertive');
  assert.match(a.text, /^New emergency alert: .*patient pat_001, simulated$/);
});

test('an early notice is announced politely as "Early notice"', () => {
  const a = announcementFor([], created('E1', 'EMERGENCY_DETECTED'), ctx);
  assert.equal(a.politeness, 'polite');
  assert.match(a.text, /^Early notice:/);
});

test('a non-emergency severity is polite', () => {
  const a = announcementFor([], created('E1', 'SOS_SENT', { severity: 'URGENT' }), ctx);
  assert.equal(a.politeness, 'polite');
});

test('an alert at another hospital is not announced under "mine", but is under "all"', () => {
  const m = created('E2', 'SOS_SENT', { alerted_hospital_id: 'h2' });
  assert.equal(announcementFor([], m, ctx), null);
  assert.ok(announcementFor([], m, { ...ctx, scope: 'all' }));
});

test('a duplicate created event says nothing', () => {
  const m = created('E1', 'SOS_SENT');
  const list = applyEvent([], m);
  assert.equal(announcementFor(list, m, ctx), null);
});

test('early notice that becomes SOS is announced like a new alert', () => {
  const list = applyEvent([], created('E1', 'EMERGENCY_DETECTED'));
  const a = announcementFor(list, { event: 'emergency.state', emergency_id: 'E1', state: 'SOS_SENT', payload: {} }, ctx);
  assert.equal(a.politeness, 'assertive');
});

test('state changes are announced for every alert; another alert also names the patient', () => {
  const list = applyEvent([], created('E1', 'SOS_SENT'));
  const ack = { event: 'hospital.acknowledged', emergency_id: 'E1', state: 'HOSPITAL_ACKNOWLEDGED', payload: {} };
  const other = announcementFor(list, ack, ctx);
  assert.equal(other.politeness, 'polite');
  assert.match(other.text, /patient .*: Acknowledged/);
  const a = announcementFor(list, ack, { ...ctx, selectedId: 'E1' });
  assert.equal(a.politeness, 'polite');
  assert.match(a.text, /Acknowledged/);
  assert.doesNotMatch(a.text, /patient/);
});

test('a state change on an alert outside the queue scope stays silent', () => {
  const list = applyEvent([], created('E9', 'SOS_SENT', { alerted_hospital_id: 'h2' }));
  const ack = { event: 'hospital.acknowledged', emergency_id: 'E9', state: 'HOSPITAL_ACKNOWLEDGED', payload: {} };
  assert.equal(announcementFor(list, ack, ctx), null);
});

test('escalated to this desk is announced and sounds; escalated away is silent', () => {
  let list = applyEvent([], created('E1', 'SOS_SENT', { alerted_hospital_id: 'h2' }));
  const toMe = { event: 'hospital.escalated', emergency_id: 'E1', state: 'ESCALATED', received_at: 2000, payload: { escalation_level: 1, from_hospital_id: 'h2', to_hospital_id: 'h1' } };
  assert.ok(announcementFor(list, toMe, ctx));
  assert.equal(shouldAlertSound(list, toMe, ctx), true);
  const mine = applyEvent([], created('E3', 'SOS_SENT'));
  const away = { event: 'hospital.escalated', emergency_id: 'E3', state: 'ESCALATED', payload: { escalation_level: 1, from_hospital_id: 'h1', to_hospital_id: 'h2' } };
  assert.equal(shouldAlertSound(mine, away, ctx), false);
});

test('sound and unread count follow the scope', () => {
  const other = created('E9', 'SOS_SENT', { alerted_hospital_id: 'h2' });
  assert.equal(shouldAlertSound([], other, ctx), false);
  assert.equal(shouldAlertSound([], other, { ...ctx, scope: 'all' }), true);
  const list = applyEvent(applyEvent([], created('E1', 'SOS_SENT')), other);
  assert.equal(countUnread(list, ctx), 1);
  assert.equal(countUnread(list, { ...ctx, scope: 'all' }), 2);
  assert.equal(shouldAlertSound([], created('E1', 'EMERGENCY_DETECTED'), ctx), false);
});

// ---- translated announcements (ctx.t) ----
import { translate } from '../i18n/translate.js';
const withLang = (lang) => ({ ...ctx, t: (key, vars) => translate(lang, key, vars) });

test('with English t the spoken text is exactly the same as without t', () => {
  for (const state of ['SOS_SENT', 'EMERGENCY_DETECTED']) {
    assert.deepEqual(announcementFor([], created('E1', state), withLang('en')), announcementFor([], created('E1', state), ctx));
  }
  const list = [{ emergency_id: 'E1', type: 'HEART', state: 'SOS_SENT', patient_id: 'pat_001', alerted_hospital_id: 'h1', severity: 'EMERGENCY' }];
  const ack = { event: 'status.changed', emergency_id: 'E1', state: 'HOSPITAL_ACKNOWLEDGED', payload: {} };
  assert.deepEqual(announcementFor(list, ack, withLang('en')), announcementFor(list, ack, ctx));
});

test('Hindi and Gujarati announcements use the translated type name, not the English one', () => {
  for (const lang of ['hi', 'gu']) {
    const a = announcementFor([], created('E1', 'SOS_SENT'), withLang(lang));
    assert.equal(a.politeness, 'assertive');
    assert.ok(!a.text.includes('Heart attack'), a.text);
    assert.ok(!a.text.includes('New emergency alert'), a.text);
    assert.ok(a.text.includes('pat_001') && a.text.includes('simulated'), a.text);
  }
});

test('translated state changes use the translated state word', () => {
  const list = [{ emergency_id: 'E1', type: 'HEART', state: 'SOS_SENT', patient_id: 'pat_001', alerted_hospital_id: 'h1', severity: 'EMERGENCY' }];
  const msg = { event: 'status.changed', emergency_id: 'E1', state: 'AMBULANCE_DISPATCHED', payload: {} };
  const en = announcementFor(list, msg, ctx).text;
  const hi = announcementFor(list, msg, withLang('hi')).text;
  assert.notEqual(hi, en);
  assert.ok(hi.includes('simulated') && !hi.includes('Ambulance dispatched'));
});

test('an unknown type and a missing patient fall back safely when translated', () => {
  const a = announcementFor([], created('E1', 'SOS_SENT', { type: 'NEW_TYPE', patient_id: null }), withLang('hi'));
  assert.ok(a.text.includes('NEW_TYPE'), a.text);
  assert.ok(!a.text.includes('null') && !a.text.includes('undefined'), a.text);
});
