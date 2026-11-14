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
import { EMERGENCY_TYPES, hasCapabilities } from '../services/contract.js';
import HospitalDetails from '../components/HospitalDetails.jsx';
import CapabilityBadges from '../components/CapabilityBadges.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { patientIcon, aedIcon, responderIcon } from '../components/mapIcons.js';
import aedData from '../data/aed.json';
import responderData from '../data/responders.json';
import { nearestAeds, respondersNear, withDistanceFrom } from '../services/nearby.js';
import { useT } from '../i18n/index.js';
import { typeText } from '../i18n/phrases.js';

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
  const t = useT();
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
          <h1 className="text-3xl font-bold">{t('map.title')}</h1>
          <SimulatedBadge text={t('map.badge', { kmh: ASSUMED_SPEED_KMH })} />
          <label className="ml-auto flex items-center gap-2 text-lg">
            <input data-testid="toggle-aed" type="checkbox" className="h-6 w-6" checked={showAed} onChange={(e) => setShowAed(e.target.checked)} />
            {t('map.aed')}
          </label>
          <label className="flex items-center gap-2 text-lg">
            <input data-testid="toggle-responders" type="checkbox" className="h-6 w-6" checked={showResponders} onChange={(e) => setShowResponders(e.target.checked)} />
            {t('map.responders')}
          </label>
          <label className="flex items-center gap-2">
            <span className="font-medium">{t('map.type')}</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg"
            >
              <option value="">{t('map.allTypes')}</option>
              {EMERGENCY_TYPES.map((ty) => (
                <option key={ty} value={ty}>{typeText(t, ty)}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>}

        <div className="relative h-[560px] overflow-hidden rounded-2xl shadow">
          {loading && (
            <div className="absolute inset-0 z-[1000] grid place-items-center bg-white/60 text-xl font-semibold">
              {t('map.loading')}
            </div>
          )}
          <MapContainer key={`${origin.lat},${origin.lng}`} center={[origin.lat, origin.lng]} zoom={12} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[origin.lat, origin.lng]} icon={patientIcon}>
              <Tooltip direction="top" offset={[0, -12]}>{t('map.patientTip', { label: origin.label })}</Tooltip>
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
          <span><b className="text-sky-600">●</b> {t('map.l.hospital')}</span>
          <span><b className="text-emerald-600">●</b> {t('map.l.has')}</span>
          <span><b className="text-slate-400">●</b> {t('map.l.missing')}</span>
          <span><b className="text-yellow-500">●</b> {t('map.l.top')}</span>
          <span><b className="text-red-600">●</b> {t('map.l.patient')}</span>
          <span>{t('map.l.abbr')}</span>
          {showAed && <span><b className="text-emerald-600">■</b> {t('map.l.aed')}</span>}
          {showResponders && <span><b className="text-purple-600">●</b> {t('map.l.resp')}</span>}
        </div>
      </section>

      <aside className="space-y-4">
        {showAed && nearAed && (
          <div data-testid="nearest-aed" className="rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow">
            <h2 className="text-lg font-bold">{t('map.nearAed')}</h2>
            <p className="text-xl font-semibold">{nearAed.name}</p>
            <p>{t('map.aedAway', { km: nearAed.distance_km, min: nearAed.walk_min })}</p>
            <p className="text-sm text-slate-500">{t('map.sampleData', { note: nearAed.note })}</p>
          </div>
        )}
        <HospitalDetails hospital={selected} type={type} onClose={() => setSelectedId(null)} />

        {ranking ? (
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-2 text-lg font-bold">{t('map.rankFor', { type: typeText(t, type) })}</h2>
            <RankingTable ranking={ranking} ownHospitalId={session?.hospital_id} onSelect={(h) => setSelectedId(h.id)} />
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="text-lg font-bold">{t('map.byDistance')}</h2>
            <p className="mb-3 text-sm text-slate-500">
              {t('map.byDistanceNote')}
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
