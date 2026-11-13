// Shared ambulance store and trip runner (features #25, #44, #45).
// - ambulances: the fleet, with a status worked out from the emergencies
//   (so Dispatch makes a unit busy and Handed over or Cancelled frees it, with no extra bookkeeping)
// - startTrip(emergencyId): runs the SIMULATED trip. Each tick posts the position to
//   POST /ambulances/{id}/location; the first tick sets EN_ROUTE and the last sets ARRIVED.
// - traffic: the simulated traffic setting used for ETA and speed
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../services/api.js';
import simConfig from '../data/sim-config.json';
import trafficConfig from '../data/traffic-config.json';
import { createRouteSimulator } from '../sim/ambulance-route.js';
import { totalFactor } from '../services/traffic.js';
import { isFinal } from '../services/stateMachine.js';
import { haversineKm, DEMO_LOCATION } from '../services/geo.js';
import { originFor, placeSampleFleet } from '../services/adapters.js';
import { routeForEmergency } from './tripRoute.js';
import { USE_MOCK, PORTAL_SIMULATES_AMBULANCE } from '../services/config.js';
import { subscribe } from '../services/socket.js';
import { decideTrip, parseMode, movementSource, classifyLocationEvent, BACKEND_WAIT_MS } from '../services/movement.js';
import { useAuth } from './AuthProvider.jsx';
import { useEmergencies } from './EmergencyProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';

const AmbulanceContext = createContext(null);
const ON_TRIP = ['AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED'];
const STATUS_FOR_STATE = { AMBULANCE_DISPATCHED: 'dispatched', EN_ROUTE: 'en_route', ARRIVED: 'at_hospital' };

export function AmbulanceProvider({ children }) {
  const { isLoggedIn, session } = useAuth();
  const { emergencies, act, addNote } = useEmergencies();
  const { hospitals } = useHospitals();
  const [rawUnits, setUnits] = useState([]);
  const units = useMemo(() => placeSampleFleet(rawUnits, hospitals), [rawUnits, hospitals]);
  const [error, setError] = useState('');
  const [traffic, setTraffic] = useState('auto'); // auto | light | moderate | heavy
  const [trips, setTrips] = useState({}); // emergency_id -> 'running' | 'paused'
  const sims = useRef(new Map());
  const mode = parseMode(PORTAL_SIMULATES_AMBULANCE);
  const backendSeen = useRef(new Set()); // emergencies for which the BACKEND has sent positions
  const recentPosts = useRef(new Map()); // emergency_id -> positions the portal itself just posted (to recognise the backend's echo)
  const [backendMoving, setBackendMoving] = useState({}); // emergency_id -> true
  const latest = useRef({});
  latest.current = { emergencies, hospitals, units, traffic, hospitalId: session?.hospital_id };

  const stopAll = useCallback(() => {
    sims.current.forEach((sim) => sim.stop());
    sims.current.clear();
    setTrips({});
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      stopAll();
      setUnits([]);
      return;
    }
    api
      .getAmbulances()
      .then((list) => {
        setUnits(list);
        setError(list.some((u) => u.sample) ? 'The backend has no ambulance list yet, so a sample fleet is shown (not real units).' : '');
      })
      .catch((err) => setError(`Could not load ambulances (${err.message}).`));
  }, [isLoggedIn, stopAll]);
  useEffect(() => stopAll, [stopAll]);

  // Fleet with live status and position.
  const ambulances = useMemo(
    () =>
      units.map((u) => {
        const e = emergencies.find((x) => x.ambulance_id === u.id && ON_TRIP.includes(x.state));
        const live = e?.ambulance?.lat != null ? { lat: e.ambulance.lat, lng: e.ambulance.lng } : {};
        return { ...u, ...live, base: { lat: u.lat, lng: u.lng }, status: e ? STATUS_FOR_STATE[e.state] : 'available', emergency_id: e?.emergency_id || null };
      }),
    [units, emergencies],
  );

  /** Available units, nearest to the patient first (each with distance_km). */
  const availableFor = useCallback(
    (emergency) => {
      const patient = originFor(emergency, hospitals) || DEMO_LOCATION;
      return ambulances
        .filter((a) => a.status === 'available')
        .map((a) => ({ ...a, distance_km: Math.round(haversineKm(a, patient) * 10) / 10 }))
        .sort((a, b) => a.distance_km - b.distance_km || a.id.localeCompare(b.id));
    },
    [ambulances, hospitals],
  );

  const stopTrip = useCallback((id) => {
    sims.current.get(id)?.stop();
    sims.current.delete(id);
    setTrips((t) => {
      const { [id]: _gone, ...rest } = t;
      return rest;
    });
  }, []);

  /** Start the simulated trip for a dispatched emergency. Does nothing if one is already running. */
  const startTrip = useCallback(
    (id) => {
      if (sims.current.has(id)) return true;
      const find = () => latest.current.emergencies.find((e) => e.emergency_id === id);
      const e = find();
      const route = e && routeForEmergency(e, latest.current.units, latest.current.hospitals, latest.current.hospitalId);
      if (!route) return false;

      // Network steps run one after another, so EN_ROUTE is always sent before ARRIVED.
      let queue = Promise.resolve();
      const run = (step) => {
        queue = queue.then(step).catch((err) => console.warn(`Simulated trip ${id}: a step failed`, err));
      };
      let enRouteSent = e.state !== 'AMBULANCE_DISPATCHED';

      const sim = createRouteSimulator({
        points: route.points,
        pickupIndex: route.pickupIndex,
        speedKmh: simConfig.speed_kmh,
        timeScale: simConfig.time_scale,
        tickMs: simConfig.tick_ms,
        getFactor: () => totalFactor(trafficConfig, latest.current.traffic, Boolean(find()?.corridor_requested)),
        onTick: (s) => {
          const current = find();
          if (!current || isFinal(current.state) || current.state === 'ARRIVED') return stopTrip(id);
          if (!enRouteSent) {
            enRouteSent = true;
            run(() => act(id, 'EN_ROUTE'));
          }
          const posts = (recentPosts.current.get(id) || []).filter((r) => Date.now() - r.at < 10000);
          recentPosts.current.set(id, [...posts, { lat: s.lat, lng: s.lng, at: Date.now() }]);
          run(() =>
            api.postAmbulanceLocation(route.ambulance.id, {
              emergency_id: id,
              lat: s.lat,
              lng: s.lng,
              heading: s.heading,
              eta_seconds: s.eta_seconds,
              remaining_km: s.remaining_km,
              progress: s.progress,
              leg: s.leg,
            }),
          );
        },
        onPickup: () => run(() => addNote(id, 'pickup', 'Patient picked up (simulated)', { picked_up: true })),
        onArrive: () => {
          run(() => act(id, 'ARRIVED'));
          stopTrip(id);
        },
      });
      sims.current.set(id, sim);
      sim.start();
      setTrips((t) => ({ ...t, [id]: 'running' }));
      return true;
    },
    [act, addNote, stopTrip],
  );

  // The backend moves the ambulance too? Then in "auto" mode the portal stops its own trip for that emergency.
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    return subscribe('ambulance.location', (msg) => {
      const id = msg.emergency_id;
      if (!id) return;
      if (classifyLocationEvent(msg, recentPosts.current.get(id) || []) !== 'backend') return;
      backendSeen.current.add(id);
      setBackendMoving((m) => (m[id] ? m : { ...m, [id]: true }));
      if (mode === 'auto' && !USE_MOCK && sims.current.has(id)) stopTrip(id);
    });
  }, [isLoggedIn, mode, stopTrip]);

  /** After Dispatch: start the portal trip, wait for the backend, or do nothing, as VITE_PORTAL_SIMULATES_AMBULANCE says. */
  const requestTrip = useCallback(
    (id) => {
      const decide = (elapsedMs) => decideTrip({ mode, useMock: USE_MOCK, backendSeen: backendSeen.current.has(id), elapsedMs });
      const first = decide(0);
      if (first === 'start') return startTrip(id);
      if (first === 'wait') setTimeout(() => decide(BACKEND_WAIT_MS) === 'start' && startTrip(id), BACKEND_WAIT_MS);
      return false;
    },
    [mode, startTrip],
  );

  /** 'portal' | 'backend' | 'auto': who moves the ambulance of this emergency (for the note on screen). */
  const movementFor = useCallback(
    (id) => movementSource({ mode, useMock: USE_MOCK, portalTripRunning: Boolean(trips[id]), backendSeen: Boolean(backendMoving[id]) }),
    [mode, trips, backendMoving],
  );

  const pauseTrip = useCallback((id) => {
    sims.current.get(id)?.pause();
    setTrips((t) => (t[id] ? { ...t, [id]: 'paused' } : t));
  }, []);
  const resumeTrip = useCallback((id) => {
    sims.current.get(id)?.resume();
    setTrips((t) => (t[id] ? { ...t, [id]: 'running' } : t));
  }, []);
  const resetTrip = useCallback((id) => sims.current.get(id)?.reset(), []);

  const value = useMemo(
    () => ({ ambulances, units, error, availableFor, traffic, setTraffic, trips, startTrip, requestTrip, movementFor, movementMode: mode, pauseTrip, resumeTrip, resetTrip }),
    [ambulances, units, error, availableFor, traffic, trips, startTrip, requestTrip, movementFor, mode, pauseTrip, resumeTrip, resetTrip],
  );
  return <AmbulanceContext.Provider value={value}>{children}</AmbulanceContext.Provider>;
}

export function useAmbulances() {
  const ctx = useContext(AmbulanceContext);
  if (!ctx) throw new Error('useAmbulances must be used inside <AmbulanceProvider>');
  return ctx;
}
