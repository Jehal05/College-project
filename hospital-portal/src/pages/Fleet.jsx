import { movementText } from '../services/movement.js';
import { USE_MOCK } from '../services/config.js';
// Ambulance fleet dashboard (feature #44) with live tracking of every active trip (feature #25).
import { useAmbulances } from '../components/AmbulanceProvider.jsx';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import { useHospitals } from '../components/HospitalProvider.jsx';
import TrackingMap, { formatEta } from '../components/TrackingMap.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { typeText } from '../i18n/phrases.js';
import { useT } from '../i18n/index.js';

// Label keys (fleet.s.<status>) and colours.
const STATUS = {
  available: 'bg-emerald-100 text-emerald-800 border-emerald-500',
  dispatched: 'bg-amber-100 text-amber-900 border-amber-500',
  en_route: 'bg-red-100 text-red-800 border-red-500',
  at_hospital: 'bg-sky-100 text-sky-800 border-sky-500',
};

export default function Fleet() {
  const t = useT();
  const { ambulances, error, movementMode } = useAmbulances();
  const { emergencies } = useEmergencies();
  const { hospitals } = useHospitals();
  const hospitalName = (id) => hospitals.find((h) => h.id === id)?.name || id;
  const free = ambulances.filter((a) => a.status === 'available').length;
  const active = emergencies.filter((e) => e.ambulance_id && ['AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED'].includes(e.state));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{t('fleet.title')}</h1>
        <SimulatedBadge text={t('fleet.badge')} />
        <span data-testid="fleet-summary" className="ml-auto text-xl font-semibold">
          {t('fleet.summary', { free, total: ambulances.length })}
        </span>
      </div>
      <p data-testid="fleet-movement" className="text-slate-600">
        {movementText(movementMode === 'true' ? 'portal' : movementMode === 'false' ? 'backend' : USE_MOCK ? 'portal' : 'auto', t)}
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full text-left text-lg">
          <thead className="bg-slate-100 text-sm uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">{t('fleet.unit')}</th>
              <th className="px-4 py-3">{t('fleet.crew')}</th>
              <th className="px-4 py-3">{t('fleet.base')}</th>
              <th className="px-4 py-3">{t('fleet.current')}</th>
              <th className="px-4 py-3">{t('fleet.status')}</th>
            </tr>
          </thead>
          <tbody>
            {ambulances.map((a) => {
              const style = STATUS[a.status];
              const label = t(`fleet.s.${a.status}`);
              const e = emergencies.find((x) => x.emergency_id === a.emergency_id);
              return (
                <tr key={a.id} data-testid="fleet-row" data-id={a.id} data-status={a.status} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <b>{a.call_sign}</b> <span className="text-slate-500">({a.id})</span>
                  </td>
                  <td className="px-4 py-3 text-base">
                    {t('fleet.driver')}: {a.crew?.driver}<br />{t('fleet.paramedic')}: {a.crew?.paramedic}
                  </td>
                  <td className="px-4 py-3 text-base">{hospitalName(a.base_hospital_id)}</td>
                  <td className="px-4 py-3">
                    {e ? (
                      <>
                        <b>{e.emergency_id}</b> · {typeText(t, e.type)}
                        {a.status === 'en_route' && e.ambulance?.eta_seconds != null && (
                          <span className="block text-base text-slate-600">{t('fleet.eta', { time: formatEta(e.ambulance.eta_seconds, t) })}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">{t('common.none')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-3 py-1 text-base font-bold ${style}`}>{label}</span>
                  </td>
                </tr>
              );
            })}
            {ambulances.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-500">{t('fleet.none')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3 text-2xl font-bold">{t('fleet.trips', { n: active.length })}</h2>
        {active.length === 0 && <p className="rounded-2xl bg-white p-6 text-slate-500 shadow">{t('fleet.noTrips')}</p>}
        <div className="grid gap-6 xl:grid-cols-2">
          {active.map((e) => (
            <div key={e.emergency_id} className="rounded-2xl bg-white p-4 shadow">
              <h3 className="mb-2 text-xl font-bold">{e.emergency_id} · {typeText(t, e.type)}</h3>
              <TrackingMap emergency={e} compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
