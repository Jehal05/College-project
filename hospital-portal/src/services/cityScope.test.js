// City scope for the desk: which hospitals, ambulances and alerts belong to the chosen city. Pure functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CITIES, alertCityId, cityOfHospital, defaultCityId, filterAlerts, filterByCity, nearestCityId, startPointOf, showingLabel } from './cityScope.js';

const CITIES = [
  { city_id: 'AMD', city_name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, zoom: 12, simulation_start: { lat: 23.03, lng: 72.58, label: 'Start A' } },
  { city_id: 'PNQ', city_name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, zoom: 12, simulation_start: { lat: 18.52, lng: 73.85, label: 'Start P' } },
];
const HOSP = [{ id: 'H1', city_id: 'AMD' }, { id: 'H2', city_id: 'AMD' }, { id: 'H6', city_id: 'PNQ' }];
const AMB = [{ id: 'AMB-1', city_id: 'AMD' }, { id: 'AMB-6', city_id: 'PNQ' }];

test('hospitals and ambulances are filtered by city; "all" keeps everything', () => {
  assert.deepEqual(filterByCity(HOSP, 'PNQ').map((h) => h.id), ['H6']);
  assert.deepEqual(filterByCity(AMB, 'AMD').map((a) => a.id), ['AMB-1']);
  assert.equal(filterByCity(HOSP, ALL_CITIES).length, 3);
  assert.deepEqual(filterByCity(undefined, 'AMD'), []);
});

test('the city of a hospital comes from its own city_id', () => {
  assert.equal(cityOfHospital(HOSP, 'H6'), 'PNQ');
  assert.equal(cityOfHospital(HOSP, 'nope'), null);
  assert.equal(cityOfHospital(HOSP, null), null);
});

test('an alert belongs to the city of the hospital that holds it', () => {
  assert.equal(alertCityId({ alerted_hospital_id: 'H6' }, HOSP, CITIES), 'PNQ');
  assert.equal(alertCityId({ alerted_hospital_id: 'H1' }, HOSP, CITIES), 'AMD');
});

test('an alert with no hospital yet belongs to the city its own data names, else the nearest city to the patient', () => {
  assert.equal(alertCityId({ city_id: 'PNQ' }, HOSP, CITIES), 'PNQ');
  assert.equal(alertCityId({ location: { lat: 18.53, lng: 73.84 } }, HOSP, CITIES), 'PNQ');
  assert.equal(alertCityId({ location: { lat: 23.05, lng: 72.6 } }, HOSP, CITIES), 'AMD');
});

test('an alert whose city cannot be known is null, and is NEVER hidden by a city filter', () => {
  const lost = { emergency_id: 'E1' };
  assert.equal(alertCityId(lost, HOSP, CITIES), null);
  assert.deepEqual(filterAlerts([lost], 'PNQ', HOSP, CITIES), [lost]);
});

test('alerts: a Pune alert is in the Pune queue and not in the Ahmedabad queue', () => {
  const a = { emergency_id: 'A', alerted_hospital_id: 'H1' }; const p = { emergency_id: 'P', alerted_hospital_id: 'H6' };
  assert.deepEqual(filterAlerts([a, p], 'PNQ', HOSP, CITIES).map((e) => e.emergency_id), ['P']);
  assert.deepEqual(filterAlerts([a, p], 'AMD', HOSP, CITIES).map((e) => e.emergency_id), ['A']);
  assert.equal(filterAlerts([a, p], ALL_CITIES, HOSP, CITIES).length, 2);
});

test('an escalated alert follows the hospital that holds it now, even across cities', () => {
  const e = { emergency_id: 'X', alerted_hospital_id: 'H1', state: 'ESCALATED' };
  assert.equal(filterAlerts([{ ...e, alerted_hospital_id: 'H6' }], 'PNQ', HOSP, CITIES).length, 1);
});

test('the first city is the desk\'s own: staff start in their hospital\'s city, admin in the first city, nothing breaks without data', () => {
  assert.equal(defaultCityId({ role: 'staff', hospital_id: 'H6' }, HOSP, CITIES), 'PNQ');
  assert.equal(defaultCityId({ role: 'admin' }, HOSP, CITIES), 'AMD');
  assert.equal(defaultCityId({ role: 'admin', hospital_id: 'H6' }, HOSP, CITIES), 'PNQ');
  assert.equal(defaultCityId({ role: 'staff', hospital_id: 'zzz' }, HOSP, CITIES), 'AMD');
  assert.equal(defaultCityId({ role: 'staff' }, [], []), null);
});

test('the nearest city is none when the point is far from every city', () => {
  assert.equal(nearestCityId(CITIES, { lat: 28.6, lng: 77.2 }), null);
  assert.equal(nearestCityId(CITIES, { lat: 18.5, lng: 73.9 }), 'PNQ');
  assert.equal(nearestCityId(CITIES, null), null);
});

test('the start point of a city is its simulation start, labelled; "all" has none', () => {
  assert.deepEqual(startPointOf(CITIES, 'PNQ'), { lat: 18.52, lng: 73.85, label: 'Start P' });
  assert.equal(startPointOf(CITIES, ALL_CITIES), null);
  assert.equal(startPointOf(CITIES, 'XYZ'), null);
});

test('the "Showing" label names the city, or says all cities', () => {
  assert.equal(showingLabel(CITIES, 'PNQ'), 'Pune, Maharashtra');
  assert.equal(showingLabel(CITIES, ALL_CITIES), null);
  assert.equal(showingLabel(CITIES, 'XYZ'), null);
});
