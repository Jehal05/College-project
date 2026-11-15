import test from 'node:test';
import assert from 'node:assert/strict';
import { severityIcon, cardDistanceKm } from './alertCardView.js';
import { applyEvent, normalise } from './emergencyReducer.js';
import { normaliseEmergency } from './adapters.js';

test('every severity has a different symbol; unknown severity gets the neutral one', () => {
  const icons = ['EMERGENCY', 'URGENT', 'WATCH', 'NONE'].map(severityIcon);
  assert.equal(new Set(icons).size, 4);
  assert.equal(severityIcon('???'), severityIcon('NONE'));
});

test('distance: only a real, non-negative number; strings, null and missing are left out', () => {
  assert.equal(cardDistanceKm({ alerted_distance_km: 4.24 }), 4.2);
  assert.equal(cardDistanceKm({ alerted_distance_km: 0 }), 0);
  for (const v of [undefined, null, '4.2', NaN, Infinity, -1]) assert.equal(cardDistanceKm({ alerted_distance_km: v }), null);
  assert.equal(cardDistanceKm(null), null);
});

test('a created emergency keeps the distance the backend sent, and none is invented', () => {
  const withDist = normaliseEmergency({ emergency_id: 'E1', type: 'HEART', state: 'SOS_SENT', hospital: { id: 'h1', distance_km: 3.5 } });
  assert.equal(withDist.alerted_distance_km, 3.5);
  const without = normaliseEmergency({ emergency_id: 'E2', type: 'HEART', state: 'SOS_SENT', hospital: { id: 'h1' } });
  assert.equal('alerted_distance_km' in without, false);
});

test('hospital.alerted fills the distance; an escalation drops the old hospital\'s distance', () => {
  const base = normalise(normaliseEmergency({ emergency_id: 'E1', type: 'HEART', state: 'SOS_SENT', created_at: '2026-01-01T00:00:00Z' }));
  let list = applyEvent([base], { event: 'hospital.alerted', emergency_id: 'E1', payload: { hospital_id: 'h1', hospital_name: 'A', distance_km: 2.5 } });
  assert.equal(list[0].alerted_distance_km, 2.5);
  list = applyEvent(list, { event: 'hospital.escalated', emergency_id: 'E1', payload: { to_hospital_id: 'h2', to_hospital_name: 'B', escalation_level: 1 } });
  assert.equal(cardDistanceKm(list[0]), null);
});
