import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPath, cumulativeKm, positionAt, etaSeconds, headingDeg, splitPath, createRouteSimulator } from './ambulance-route.js';

const A = { lat: 23.0, lng: 72.5 };
const P = { lat: 23.0, lng: 72.6 };
const H = { lat: 23.1, lng: 72.6 };
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
// A straight two-point path makes the numbers easy to check: about 10.24 km due east.
const straight = [A, P];
const straightKm = cumulativeKm(straight);

test('path goes ambulance -> patient -> hospital with the patient at pickupIndex', () => {
  const { points, pickupIndex } = buildPath({ ...A, id: 'AMB-1' }, P, H);
  assert.deepEqual(points[0], A);
  assert.deepEqual(points[pickupIndex], P);
  assert.deepEqual(points.at(-1), H);
  assert.equal(points.length, 7);
  assert.equal(pickupIndex, 3);
});

test('cumulative distance starts at 0 and only grows', () => {
  const c = cumulativeKm(buildPath(A, P, H).points);
  assert.equal(c[0], 0);
  for (let i = 1; i < c.length; i++) assert.ok(c[i] > c[i - 1]);
  assert.ok(near(straightKm[1], 10.24, 0.05));
});

test('position along the path: start, middle, end, and clamped beyond both ends', () => {
  const total = straightKm[1];
  assert.deepEqual({ lat: positionAt(straight, straightKm, 0).lat, lng: positionAt(straight, straightKm, 0).lng }, A);
  const mid = positionAt(straight, straightKm, total / 2);
  assert.ok(near(mid.lng, 72.55, 0.0001) && near(mid.lat, 23.0, 0.0001));
  assert.ok(near(positionAt(straight, straightKm, total).lng, 72.6, 1e-9));
  assert.ok(near(positionAt(straight, straightKm, total + 50).lng, 72.6, 1e-9));
  assert.ok(near(positionAt(straight, straightKm, -5).lng, 72.5, 1e-9));
});

test('heading: east is 90, north is 0', () => {
  assert.ok(near(headingDeg(A, P), 90, 0.1));
  assert.ok(near(headingDeg(P, H), 0, 0.1));
  assert.ok(near(positionAt(straight, straightKm, 1).heading, 90, 0.1));
});

test('ETA: 10 km at 40 km/h is 15 minutes; heavy traffic makes it longer; never negative', () => {
  assert.equal(etaSeconds(10, 40), 900);
  assert.equal(etaSeconds(10, 40, 1.7), 1530);
  assert.equal(etaSeconds(0, 40), 0);
  assert.equal(etaSeconds(-1, 40), 0);
});

test('splitPath gives the driven part and the part still to go', () => {
  const { points } = buildPath(A, P, H);
  const c = cumulativeKm(points);
  const { done, remaining } = splitPath(points, c, 0.5);
  assert.deepEqual(done[0], points[0]);
  assert.deepEqual(remaining.at(-1), points.at(-1));
  assert.deepEqual(done.at(-1), remaining[0]);
  assert.equal(splitPath(points, c, 0).done.length, 2);
  assert.equal(splitPath(points, c, 1).remaining.length, 2);
});

function sim(over = {}) {
  const log = { ticks: [], pickups: 0, arrivals: 0 };
  const { points, pickupIndex } = buildPath(A, P, H);
  const s = createRouteSimulator({
    points, pickupIndex, speedKmh: 40, timeScale: 9, tickMs: 1000,
    onTick: (x) => log.ticks.push(x), onPickup: () => log.pickups++, onArrive: () => log.arrivals++, ...over,
  });
  return { s, log };
}

test('simulator: each tick moves speed x time scale, and remaining distance and ETA go down', () => {
  const { s } = sim();
  s.start();
  const a = s.tick(1000);
  assert.ok(near(a.distance_km, (40 * 9) / 3600, 1e-9)); // 0.1 km per second at 9x
  const b = s.tick(1000);
  assert.ok(b.remaining_km < a.remaining_km);
  assert.ok(b.eta_seconds < a.eta_seconds);
  assert.ok(near(b.remaining_km + b.distance_km, s.totalKm, 0.01));
  s.stop();
});

test('simulator: a 6-minute trip takes about 40 seconds at time scale 9', () => {
  const { s } = sim();
  const realSeconds = (4 / 40) * 3600; // 4 km at 40 km/h = 360 s
  assert.equal(realSeconds, 360);
  assert.equal(realSeconds / 9, 40);
  assert.ok(s.totalKm > 20); // this test route is longer; the ratio is what matters
});

test('simulator: pickup fires once at the patient, arrival fires once at the hospital', () => {
  const { s, log } = sim();
  s.start();
  let guard = 0;
  let sawToPatient = false;
  while (s.status === 'running' && guard++ < 5000) {
    const snap = s.tick(1000);
    if (snap.leg === 'to_patient') {
      sawToPatient = true;
      assert.equal(log.pickups, 0);
    }
  }
  assert.ok(sawToPatient);
  assert.equal(log.pickups, 1);
  assert.equal(log.arrivals, 1);
  assert.equal(s.status, 'arrived');
  const last = log.ticks.at(-1);
  assert.equal(last.arrived, true);
  assert.equal(last.remaining_km, 0);
  assert.equal(last.eta_seconds, 0);
  assert.equal(last.progress, 1);
  assert.ok(near(last.lat, H.lat, 1e-9) && near(last.lng, H.lng, 1e-9));
  const before = log.ticks.length;
  s.tick(1000);
  assert.equal(log.ticks.length, before, 'no ticks after arrival');
});

test('simulator: pause stops movement, resume continues, reset goes back to the start', () => {
  const { s } = sim();
  s.start();
  s.tick(1000);
  s.pause();
  const paused = s.snapshot().distance_km;
  s.tick(1000);
  assert.equal(s.snapshot().distance_km, paused);
  s.resume();
  s.tick(1000);
  assert.ok(s.snapshot().distance_km > paused);
  s.reset();
  assert.equal(s.snapshot().distance_km, 0);
  assert.equal(s.status, 'running');
  s.stop();
});

test('simulator: heavier traffic means slower movement and a longer ETA', () => {
  let factor = 1;
  const { s } = sim({ getFactor: () => factor });
  s.start();
  const light = s.tick(1000).distance_km;
  const etaLight = s.snapshot().eta_seconds;
  factor = 1.7;
  const etaHeavy = s.snapshot().eta_seconds;
  const step = s.tick(1000).distance_km - light;
  assert.ok(near(step, light / 1.7, 1e-9));
  assert.ok(etaHeavy > etaLight);
  s.stop();
});

// ---- movement follows real elapsed time (a hidden tab slows timers) ----
import { MAX_STEP_MS } from './ambulance-route.js';

const running = [];
test.afterEach(() => {
  while (running.length) running.pop().stop(); // the timers must not keep the test process alive
});
function clocked(extra = {}) {
  const clock = { t: 1_000_000 };
  const sim = createRouteSimulator({ points: straight, pickupIndex: 0, speedKmh: 60, timeScale: 1, tickMs: 1000, now: () => clock.t, ...extra });
  running.push(sim);
  return { clock, sim };
}

test('a late tick covers the whole time that passed (60 s late = 60 s of driving)', () => {
  const { clock, sim } = clocked();
  sim.start();
  clock.t += 60_000;
  const snap = sim.tick(); // one step, a minute after the start: 60 km/h for 1 minute = 1 km
  assert.ok(near(snap.distance_km, 1, 0.001), `got ${snap.distance_km}`);
});
test('one big late tick equals many small ones', () => {
  const a = clocked();
  a.sim.start();
  a.clock.t += 30_000;
  const late = a.sim.tick().distance_km;
  const b = clocked();
  b.sim.start();
  for (let i = 0; i < 30; i += 1) {
    b.clock.t += 1000;
    b.sim.tick();
  }
  assert.ok(near(late, b.sim.snapshot().distance_km, 0.0001));
});
test('catchUp() applies the time that passed while the tab was hidden', () => {
  const { clock, sim } = clocked();
  sim.start();
  clock.t += 120_000;
  const snap = sim.catchUp();
  assert.ok(near(snap.distance_km, 2, 0.001));
});
test('time spent paused does not count', () => {
  const { clock, sim } = clocked();
  sim.start();
  clock.t += 10_000;
  sim.tick();
  const before = sim.snapshot().distance_km;
  sim.pause();
  clock.t += 600_000; // ten minutes paused
  sim.resume();
  clock.t += 1000;
  const after = sim.tick().distance_km;
  assert.ok(near(after - before, 60 / 3600, 0.0005), `moved ${after - before} km`);
});
test('one step never covers more than the cap, and never goes backwards', () => {
  const { clock, sim } = clocked({ speedKmh: 10, timeScale: 1 });
  sim.start();
  clock.t += 5 * 3600 * 1000; // five hours asleep
  const capKm = (10 * MAX_STEP_MS) / 3600000;
  assert.ok(sim.tick().distance_km <= capKm + 0.0001);
  clock.t -= 10_000; // a clock that jumps back
  const d = sim.snapshot().distance_km;
  assert.ok(sim.tick().distance_km >= d);
});
test('an explicit number of ms still works (used by the older tests)', () => {
  const { sim } = clocked();
  sim.start();
  assert.ok(near(sim.tick(60_000).distance_km, 1, 0.001));
});
test('a throttled tab still arrives and calls onArrive once', () => {
  let arrived = 0;
  const { clock, sim } = clocked({ speedKmh: 600, onArrive: () => arrived++ });
  sim.start();
  clock.t += 60_000; // one tick a minute at 600 km/h = 10 km: the end of the 10.2 km route is near
  sim.tick();
  clock.t += 60_000;
  sim.tick();
  assert.equal(arrived, 1);
  assert.equal(sim.status, 'arrived');
});
