// Ambulance route simulator (feature #25). EVERYTHING HERE IS SIMULATED.
// The path is made of straight segments with a few bends. It is NOT a road route
// and must always be shown with a "Simulated" label.
//
// This file has no React and no network code, so the maths can be unit tested
// (see ambulance-route.test.js). components/AmbulanceProvider.jsx connects it to the app.
import { haversineKm } from '../services/geo.js';

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

/** Compass heading in degrees (0 = north, 90 = east) from point a to point b. */
export function headingDeg(a, b) {
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** One leg from a to b with two gentle bends, so it does not look like a ruler line. */
function leg(a, b, side) {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  const bend = (t, sign) => ({
    lat: a.lat + dLat * t + -dLng * 0.08 * sign,
    lng: a.lng + dLng * t + dLat * 0.08 * sign,
  });
  return [a, bend(1 / 3, side), bend(2 / 3, -side), b];
}

/**
 * Path: ambulance -> patient -> hospital.
 * Returns { points, pickupIndex } where points[pickupIndex] is the patient.
 */
export function buildPath(ambulance, patient, hospital) {
  const pick = ({ lat, lng }) => ({ lat, lng });
  const first = leg(pick(ambulance), pick(patient), 1);
  const second = leg(pick(patient), pick(hospital), -1);
  return { points: [...first, ...second.slice(1)], pickupIndex: first.length - 1 };
}

/** Distance in km from the start to each point. cumulative[0] is 0; the last value is the total. */
export function cumulativeKm(points) {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + haversineKm(points[i - 1], points[i]));
  return out;
}

/** Where the ambulance is after travelling `distanceKm` along the path. */
export function positionAt(points, cumulative, distanceKm) {
  const total = cumulative[cumulative.length - 1];
  const d = Math.max(0, Math.min(total, distanceKm));
  let i = 1;
  while (i < points.length - 1 && cumulative[i] < d) i++;
  const a = points[i - 1];
  const b = points[i];
  const span = cumulative[i] - cumulative[i - 1];
  const t = span === 0 ? 1 : (d - cumulative[i - 1]) / span;
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, heading: headingDeg(a, b), segment: i - 1 };
}

/** Seconds of (simulated) real driving left. `factor` is the traffic multiplier (1 = clear road). */
export function etaSeconds(remainingKm, speedKmh, factor = 1) {
  return Math.max(0, Math.round((remainingKm / speedKmh) * 3600 * factor));
}

/** Split the path at the ambulance position: the part already driven and the part still to go. */
export function splitPath(points, cumulative, progress) {
  const total = cumulative[cumulative.length - 1];
  const pos = positionAt(points, cumulative, total * Math.max(0, Math.min(1, progress || 0)));
  const here = { lat: pos.lat, lng: pos.lng };
  return { done: [...points.slice(0, pos.segment + 1), here], remaining: [here, ...points.slice(pos.segment + 1)] };
}

/**
 * The simulator. Call start(); it calls onTick once per tick with the new position.
 *   speedKmh   assumed driving speed
 *   timeScale  demo speed-up (9 = nine times faster than real time)
 *   getFactor  returns the current traffic multiplier (read on every tick, so it can change mid-trip)
 *   onTick(snapshot), onPickup(snapshot) once at the patient, onArrive(snapshot) once at the hospital
 */
export function createRouteSimulator({
  points,
  pickupIndex,
  speedKmh,
  timeScale = 1,
  tickMs = 1000,
  getFactor = () => 1,
  onTick,
  onPickup,
  onArrive,
}) {
  const cumulative = cumulativeKm(points);
  const totalKm = cumulative[cumulative.length - 1];
  const pickupKm = cumulative[pickupIndex];
  let distanceKm = 0;
  let status = 'idle'; // idle | running | paused | arrived
  let pickedUp = false;
  let timer = null;

  function snapshot() {
    const factor = getFactor() || 1;
    const pos = positionAt(points, cumulative, distanceKm);
    const remaining = Math.max(0, totalKm - distanceKm);
    return {
      lat: pos.lat,
      lng: pos.lng,
      heading: Math.round(pos.heading),
      distance_km: distanceKm,
      remaining_km: Math.round(remaining * 100) / 100,
      progress: totalKm === 0 ? 1 : distanceKm / totalKm,
      eta_seconds: etaSeconds(remaining, speedKmh, factor),
      leg: distanceKm < pickupKm ? 'to_patient' : 'to_hospital',
      arrived: distanceKm >= totalKm,
    };
  }

  /** Move forward by dtMs of wall-clock time. Called by the timer; tests call it directly. */
  function tick(dtMs = tickMs) {
    if (status !== 'running') return snapshot();
    const factor = getFactor() || 1;
    distanceKm = Math.min(totalKm, distanceKm + (speedKmh / factor) * timeScale * (dtMs / 3600000));
    const snap = snapshot();
    if (!pickedUp && distanceKm >= pickupKm) {
      pickedUp = true;
      onPickup?.(snap);
    }
    onTick?.(snap);
    if (snap.arrived) {
      status = 'arrived';
      clearInterval(timer);
      onArrive?.(snap);
    }
    return snap;
  }

  const run = () => {
    clearInterval(timer);
    timer = setInterval(() => tick(tickMs), tickMs);
  };

  return {
    start() {
      if (status !== 'idle') return;
      status = 'running';
      onTick?.(snapshot()); // show the ambulance at its base straight away
      run();
    },
    pause() {
      if (status !== 'running') return;
      status = 'paused';
      clearInterval(timer);
    },
    resume() {
      if (status !== 'paused') return;
      status = 'running';
      run();
    },
    /** Back to the start of the route (keeps running or paused as it was). */
    reset() {
      if (status === 'arrived' || status === 'idle') return;
      distanceKm = 0;
      onTick?.(snapshot());
    },
    stop() {
      clearInterval(timer);
      if (status !== 'arrived') status = 'idle';
    },
    tick,
    snapshot,
    get status() {
      return status;
    },
    totalKm,
    pickupKm,
  };
}
