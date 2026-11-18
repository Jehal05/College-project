// Road routing logic with a fake fetch: no internet, no routing server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { osrmUrl, parseOsrm, fetchRoadLeg, roadVersion, loadRoad, cachedRoad, clearRoadCache } from './roadRoute.js';

const A = { lat: 23.03, lng: 72.58 };
const B = { lat: 23.05, lng: 72.6 };
const ok = (coords, distance = 3200, duration = 400) => ({ code: 'Ok', routes: [{ distance, duration, geometry: { coordinates: coords } }] });
const reply = (json, status = 200) => async () => ({ ok: status < 300, status, json: async () => json });

test('the address holds only four numbers (longitude first) and nothing about the person', () => {
  const u = osrmUrl('https://router.project-osrm.org/', A, B);
  assert.equal(u, 'https://router.project-osrm.org/route/v1/driving/72.58,23.03;72.6,23.05?overview=full&geometries=geojson');
});

test('parseOsrm turns an answer into points, km and seconds; odd answers become null', () => {
  const r = parseOsrm(ok([[72.58, 23.03], [72.59, 23.04], [72.6, 23.05]]));
  assert.deepEqual(r.points[0], { lat: 23.03, lng: 72.58 });
  assert.equal(r.points.length, 3);
  assert.equal(r.distance_km, 3.2);
  assert.equal(r.duration_s, 400);
  assert.equal(parseOsrm({ code: 'NoRoute', routes: [] }), null);
  assert.equal(parseOsrm(null), null);
  assert.equal(parseOsrm(ok([[72.58, 23.03]])), null);
  assert.equal(parseOsrm(ok([[999, 23.03], [72.6, 23.05]])), null);
});

test('a bad status, a thrown error or a slow server gives null, never an exception', async () => {
  assert.equal(await fetchRoadLeg(A, B, { fetchImpl: reply({}, 503) }), null);
  assert.equal(await fetchRoadLeg(A, B, { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), null);
  assert.equal(await fetchRoadLeg(A, B, { fetchImpl: () => new Promise(() => {}), timeoutMs: 30 }), null);
  assert.equal(await fetchRoadLeg({ lat: NaN, lng: 1 }, B, { fetchImpl: reply(ok([[1, 1], [2, 2]])) }), null);
});

const route = () => ({ ambulance: { id: 'AMB-1', base: A }, patient: { lat: 23.04, lng: 72.59 }, hospital: { id: 'H1', lat: 23.05, lng: 72.6 }, points: [], pickupIndex: 0 });

test('roadVersion joins both legs, marks the patient point, and keeps the road source and estimate', async () => {
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); const first = calls.length === 1; return { ok: true, json: async () => ok(first ? [[72.58, 23.03], [72.585, 23.035], [72.59, 23.04]] : [[72.59, 23.04], [72.6, 23.05]], 2000, 200) }; };
  const v = await roadVersion(route(), { fetchImpl });
  assert.equal(v.source, 'road');
  assert.equal(v.points.length, 4);
  assert.equal(v.pickupIndex, 2);
  assert.equal(v.road_seconds, 400);
  assert.ok(v.totalKm > 0);
  assert.equal(calls.length, 2);
});

test('if one leg fails the whole road route is dropped (no half road, half simulated path)', async () => {
  let n = 0;
  const fetchImpl = async () => { n += 1; return n === 1 ? { ok: true, json: async () => ok([[72.58, 23.03], [72.59, 23.04]]) } : { ok: false, status: 500 }; };
  assert.equal(await roadVersion(route(), { fetchImpl }), null);
});

test('loadRoad asks once per trip and remembers the answer', async () => {
  clearRoadCache();
  let n = 0;
  const fetchImpl = async () => { n += 1; return { ok: true, json: async () => ok([[72.58, 23.03], [72.6, 23.05]]) }; };
  const r = route();
  const a = await loadRoad(r, { fetchImpl });
  const b = await loadRoad(r, { fetchImpl });
  assert.equal(a, b);
  assert.equal(n, 2); // two legs, once
  assert.equal(cachedRoad(r), a);
});
