// Live ambulance tracking (feature #25) with simulated traffic and green corridor (feature #45).
// Reads the position from the emergency (kept up to date by ambulance.location events),
// so it shows the same thing on every screen that is watching.
import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline } from 'react-leaflet';
import trafficConfig from '../data/traffic-config.json';
import simConfig from '../data/sim-config.json';
import { splitPath } from '../sim/ambulance-route.js';
import { resolveLevel } from '../services/traffic.js';
import { isFinal } from '../services/stateMachine.js';
import { routeForEmergency } from './tripRoute.js';
import { patientIcon, hospitalPinIcon, ambulanceIcon } from './mapIcons.js';
import { useAmbulances } from './AmbulanceProvider.jsx';
import { useEmergencies } from './EmergencyProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';
import { useAuth } from './AuthProvider.jsx';
import SimulatedBadge from './SimulatedBadge.jsx';

export function formatEta(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

export default function TrackingMap({ emergency, compact = false }) {
  const { session } = useAuth();
  const { hospitals } = useHospitals();
  const { units, traffic, setTraffic, trips, startTrip, pauseTrip, resumeTrip, resetTrip } = useAmbulances();
  const { addNote } = useEmergencies();
  const [message, setMessage] = useState('');
  const e = emergency;
  const id = e.emergency_id;

  const route = useMemo(
    () => routeForEmergency(e, units, hospitals, session?.hospital_id),
    [e.ambulance_id, e.alerted_hospital_id, e.location?.lat, e.location?.lng, units, hospitals, session?.hospital_id],
  );
  if (!route) return <p className="rounded-xl bg-slate-100 p-4 text-slate-500">Waiting for ambulance details…</p>;

  const arrived = e.state === 'ARRIVED' || e.state === 'HANDOVER_DONE';
  const closed = isFinal(e.state);
  const live = e.ambulance?.lat != null;
  const progress = arrived ? 1 : live ? e.ambulance.progress || 0 : 0;
  const position = arrived ? route.hospital : live ? e.ambulance : route.points[0];
  const { done, remaining } = splitPath(route.points, route.cumulative, progress);
  const toLatLng = (p) => [p.lat, p.lng];
  const trip = trips[id];
  const moving = e.state === 'AMBULANCE_DISPATCHED' || e.state === 'EN_ROUTE';
  const level = resolveLevel(trafficConfig, traffic);

  async function requestCorridor() {
    setMessage('');
    try {
      await addNote(id, 'corridor', 'Corridor request logged (simulated)', { corridor_requested: true });
    } catch (err) {
      setMessage(`Could not log the request: ${err.message}`);
    }
  }

  return (
    <div data-testid="tracking" data-emergency={id}>
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <div className="text-sm text-slate-500">
            {route.ambulance.call_sign} ({route.ambulance.id}) → {route.hospital.name}
          </div>
          <div data-testid="eta" data-seconds={arrived ? 0 : e.ambulance?.eta_seconds ?? ''} className={`text-4xl font-bold tabular-nums ${arrived ? 'text-emerald-600' : 'text-red-600'}`}>
            {arrived ? 'Arrived' : live ? `ETA ${formatEta(e.ambulance.eta_seconds)}` : 'ETA …'}
          </div>
          <div data-testid="trip-leg" className="font-semibold text-slate-700">
            {arrived
              ? 'Ambulance is at the hospital'
              : !live
                ? 'Ambulance assigned, about to leave'
                : e.ambulance.leg === 'to_patient'
                  ? `Heading to the patient · ${e.ambulance.remaining_km} km left in total`
                  : `Patient on board · heading to the hospital · ${e.ambulance.remaining_km} km left`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SimulatedBadge text="Simulated ambulance and route" />
          <SimulatedBadge text={`Not a road route · runs ${simConfig.time_scale}× faster than real time`} />
        </div>
      </div>

      <div className={`${compact ? 'h-64' : 'h-96'} overflow-hidden rounded-xl border border-slate-200`}>
        <MapContainer key={`${id}-${route.ambulance.id}`} bounds={route.points.map(toLatLng)} boundsOptions={{ padding: [40, 40] }} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={done.map(toLatLng)} pathOptions={{ color: '#94a3b8', weight: 6 }} />
          <Polyline positions={remaining.map(toLatLng)} pathOptions={{ color: '#2563eb', weight: 6, dashArray: '2 10' }} />
          <Marker position={toLatLng(route.patient)} icon={patientIcon}>
            <Tooltip direction="top" offset={[0, -12]}>Patient (simulated)</Tooltip>
          </Marker>
          <Marker position={toLatLng(route.hospital)} icon={hospitalPinIcon}>
            <Tooltip direction="top" offset={[0, -16]}>{route.hospital.name}</Tooltip>
          </Marker>
          <Marker position={toLatLng(position)} icon={ambulanceIcon(e.ambulance?.heading || 0, route.ambulance.call_sign)} zIndexOffset={1000}>
            <Tooltip direction="top" offset={[0, -22]}>{route.ambulance.call_sign} (simulated)</Tooltip>
          </Marker>
        </MapContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-600">
        <span><b className="text-slate-400">━</b> Driven</span>
        <span><b className="text-blue-600">┅</b> Still to go</span>
        <span><b className="text-red-600">●</b> Patient</span>
        <span><b className="text-emerald-600">■</b> Hospital</span>
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-slate-50 p-3">
          <label className="flex items-center gap-2">
            <span className="font-semibold">Traffic</span>
            <select data-testid="traffic" value={traffic} onChange={(ev) => setTraffic(ev.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">
              <option value="auto">Auto by time of day ({trafficConfig.levels[resolveLevel(trafficConfig, 'auto')].label})</option>
              {Object.entries(trafficConfig.levels).map(([key, l]) => (
                <option key={key} value={key}>{l.label} (×{l.factor})</option>
              ))}
            </select>
            <SimulatedBadge text={`Simulated traffic: ${trafficConfig.levels[level].label}`} className="!text-xs" />
          </label>

          <div className="flex items-center gap-2">
            <button
              data-testid="corridor"
              disabled={!moving || e.corridor_requested}
              onClick={requestCorridor}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              Request green corridor
            </button>
            {e.corridor_requested ? (
              <SimulatedBadge text="Corridor request logged (simulated)" />
            ) : (
              <SimulatedBadge text="Simulated" className="!text-xs" />
            )}
          </div>

          {moving && !closed && (
            <div data-testid="sim-controls" data-trip={trip || 'none'} className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Simulation</span>
              {!trip && (
                <button data-testid="trip-start" onClick={() => startTrip(id)} className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 px-3 py-1.5 font-semibold text-amber-900">
                  Start simulated trip
                </button>
              )}
              {trip === 'running' && (
                <button data-testid="trip-pause" onClick={() => pauseTrip(id)} className="rounded-lg bg-slate-200 px-3 py-1.5 font-semibold">Pause</button>
              )}
              {trip === 'paused' && (
                <button data-testid="trip-resume" onClick={() => resumeTrip(id)} className="rounded-lg bg-slate-200 px-3 py-1.5 font-semibold">Resume</button>
              )}
              {trip && (
                <button data-testid="trip-reset" onClick={() => resetTrip(id)} className="rounded-lg bg-slate-200 px-3 py-1.5 font-semibold">Restart route</button>
              )}
            </div>
          )}
          {message && <p role="alert" className="w-full rounded-lg bg-red-100 p-2 font-semibold text-red-800">{message}</p>}
        </div>
      )}
    </div>
  );
}
