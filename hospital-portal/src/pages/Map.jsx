import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Circle } from 'react-leaflet';
import L from 'leaflet';
import { USE_MOCK } from '../services/config.js';
import { originFor } from '../services/adapters.js';
import { DEMO_LOCATION, ASSUMED_SPEED_KMH, withDistance } from '../services/geo.js';
import { useHospitals } from '../components/HospitalProvider.jsx';
import { useRanking } from '../components/useRanking.js';
import RankingTable from '../components/RankingTable.jsx';
import { useAuth } from '../components/AuthProvider.jsx';
import { EMERGENCY_TYPES, TYPE_LABELS, hasCapabilities } from '../services/contract.js';
import HospitalDetails from '../components/HospitalDetails.jsx';
import CapabilityBadges from '../components/CapabilityBadges.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { patientIcon, aedIcon, responderIcon } from '../components/mapIcons.js';
import aedData from '../data/aed.json';
import responderData from '../data/responders.json';
import { nearestAeds, respondersNear, withDistanceFrom } from '../services/nearby.js';

// Custom HTML markers (avoids Leaflet's default-icon image path problem in Vite).
function hospitalIcon(h, selected, isTop) {
  // green = has the capabilities for the chosen emergency, grey = missing, blue = no type chosen
  const color = h.capability_match === null ? '#0284c7' : h.capability_match ? '#059669' : '#94a3b8';
  const badges = [h.capabilities.cath_lab && 'CL', h.capabilities.stroke_unit && 'SU', h.capabilities.icu && 'ICU']
    .filter(Boolean)
    .join(' · ');
  return L.divIcon({
    className: 'ht-marker',
    iconSize: [44, 60],
    iconAnchor: [22, 44],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="width:${selected ? 44 : 38}px;height:${selected ? 44 : 38}px;border-radius:50%;
          background:${color};color:#fff;font-weight:800;font-size:18px;display:grid;place-items:center;
          border:${isTop ? 5 : 3}px solid ${isTop ? '#facc15' : selected ? '#0f172a' : '#fff'};box-shadow:0 2px 6px rgba(0,0,0,.35)">${isTop ? '1' : 'H'}</div>
        <div style="margin-top:2px;background:#0f172a;color:#fff;font-size:11px;font-weight:700;
          padding:1px 5px;border-radius:4px;white-space:nowrap">${isTop ? 'TOP RANKED · ' : ''}${badges || 'ER only'}</div>
      </div>`,
  });
}

export default function MapPage() {
  const { hospitals: stored, loading, error } = useHospitals();
  const { session } = useAuth();
  const [type, setType] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showAed, setShowAed] = useState(false);
  const [showResponders, setShowResponders] = useState(false);
  // Mock mode keeps the sample patient. With a real backend the map starts from the middle of the hospitals, not a fixed city.
  const origin = useMemo(() => (USE_MOCK ? DEMO_LOCATION : { ...(originFor(null, stored) || DEMO_LOCATION), label: 'Middle of the hospitals (no patient selected)' }), [stored]);

  // Distance and capability match are worked out here, so colours and details change at once.
  const hospitals = useMemo(
    () => withDistance(stored, origin).map((h) => ({ ...h, capability_match: type ? hasCapabilities(h, type) : null })),
    [stored, type, origin],
  );
  const ranking = useRanking(type, origin);
  const topId = ranking?.ranked[0]?.hospital.id || null;
  const selected = hospitals.find((h) => h.id === selectedId) || null;
  const aedList = useMemo(() => withDistanceFrom(aedData, origin), [origin]);
  const nearAed = useMemo(() => nearestAeds(aedData, origin, 1)[0], [origin]);
  const nearResponders = useMemo(() => respondersNear(responderData, origin), [origin]);
  const byDistance = useMemo(() => [...hospitals].sort((a, b) => a.distance_km - b.distance_km), [hospitals]);

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Nearby hospitals</h1>
          <SimulatedBadge text={`Simulated ETA · assumed ${ASSUMED_SPEED_KMH} km/h`} />
          <label className="ml-auto flex items-center gap-2 text-lg">
            <input data-testid="toggle-aed" type="checkbox" className="h-6 w-6" checked={showAed} onChange={(e) => setShowAed(e.target.checked)} />
            AED locations (sample)
          </label>
          <label className="flex items-center gap-2 text-lg">
            <input data-testid="toggle-responders" type="checkbox" className="h-6 w-6" checked={showResponders} onChange={(e) => setShowResponders(e.target.checked)} />
            Community responders (sample)
          </label>
          <label className="flex items-center gap-2">
            <span className="font-medium">Emergency type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg"
            >
              <option value="">All (no filter)</option>
              {EMERGENCY_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>}

        <div className="relative h-[560px] overflow-hidden rounded-2xl shadow">
          {loading && (
            <div className="absolute inset-0 z-[1000] grid place-items-center bg-white/60 text-xl font-semibold">
              Loading hospitals…
            </div>
          )}
          <MapContainer key={`${origin.lat},${origin.lng}`} center={[origin.lat, origin.lng]} zoom={12} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[origin.lat, origin.lng]} icon={patientIcon}>
              <Tooltip direction="top" offset={[0, -12]}>{origin.label} (simulated)</Tooltip>
            </Marker>
            <Circle
              center={[origin.lat, origin.lng]}
              radius={5000}
              pathOptions={{ color: '#dc2626', weight: 1, fillOpacity: 0.04 }}
            />
            {showAed && aedList.map((a) => (
              <Marker key={a.id} position={[a.lat, a.lng]} icon={aedIcon}>
                <Tooltip direction="top" offset={[0, -14]}>{a.name} · {a.distance_km} km (sample)</Tooltip>
              </Marker>
            ))}
            {showResponders && nearResponders.map((r) => (
              <Marker key={r.id} position={[r.lat, r.lng]} icon={responderIcon}>
                <Tooltip direction="top" offset={[0, -14]}>{r.name} · {r.distance_km} km (sample)</Tooltip>
              </Marker>
            ))}
            {hospitals.map((h) => (
              <Marker
                key={h.id}
                position={[h.lat, h.lng]}
                icon={hospitalIcon(h, h.id === selectedId, h.id === topId)}
                eventHandlers={{ click: () => setSelectedId(h.id) }}
              >
                <Tooltip direction="top" offset={[0, -44]}>
                  {h.name} · {h.distance_km} km
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <span><b className="text-sky-600">●</b> Hospital</span>
          <span><b className="text-emerald-600">●</b> Has needed capability</span>
          <span><b className="text-slate-400">●</b> Missing a needed capability</span>
          <span><b className="text-yellow-500">●</b> Top ranked (yellow ring)</span>
          <span><b className="text-red-600">●</b> Patient (demo location)</span>
          <span>CL = Cath Lab · SU = Stroke Unit</span>
          {showAed && <span><b className="text-emerald-600">■</b> AED (sample)</span>}
          {showResponders && <span><b className="text-purple-600">●</b> Community responder (sample)</span>}
        </div>
      </section>

      <aside className="space-y-4">
        {showAed && nearAed && (
          <div data-testid="nearest-aed" className="rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow">
            <h2 className="text-lg font-bold">Nearest AED to the patient</h2>
            <p className="text-xl font-semibold">{nearAed.name}</p>
            <p>{nearAed.distance_km} km away · about {nearAed.walk_min} min on foot (simulated)</p>
            <p className="text-sm text-slate-500">Sample data. {nearAed.note}</p>
          </div>
        )}
        <HospitalDetails hospital={selected} type={type} onClose={() => setSelectedId(null)} />

        {ranking ? (
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-2 text-lg font-bold">Ranking for: {TYPE_LABELS[type]}</h2>
            <RankingTable ranking={ranking} ownHospitalId={session?.hospital_id} onSelect={(h) => setSelectedId(h.id)} />
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="text-lg font-bold">All hospitals by distance</h2>
            <p className="mb-3 text-sm text-slate-500">
              Distance only, not a recommendation. Choose an emergency type to see the ranking.
            </p>
            <ul className="space-y-2">
              {byDistance.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => setSelectedId(h.id)}
                    className={`w-full rounded-xl border p-3 text-left hover:bg-slate-50 ${
                      h.id === selectedId ? 'border-sky-500 bg-sky-50' : 'border-slate-200'
                    } ${h.capability_match === false ? 'opacity-60' : ''}`}
                  >
                    <div className="flex justify-between font-semibold">
                      <span>{h.name}</span>
                      <span>{h.distance_km} km · {h.eta_min} min</span>
                    </div>
                    <div className="mt-1">
                      <CapabilityBadges capabilities={h.capabilities} size="sm" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
