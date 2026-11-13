import { movementText } from '../services/movement.js';
import { USE_MOCK } from '../services/config.js';
// Ambulance fleet dashboard (feature #44) with live tracking of every active trip (feature #25).
import { useAmbulances } from '../components/AmbulanceProvider.jsx';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import { useHospitals } from '../components/HospitalProvider.jsx';
import TrackingMap, { formatEta } from '../components/TrackingMap.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { TYPE_LABELS } from '../services/contract.js';

const STATUS = {
  available: ['Available', 'bg-emerald-100 text-emerald-800 border-emerald-500'],
  dispatched: ['Dispatched', 'bg-amber-100 text-amber-900 border-amber-500'],
  en_route: ['En route', 'bg-red-100 text-red-800 border-red-500'],
  at_hospital: ['At hospital', 'bg-sky-100 text-sky-800 border-sky-500'],
};

export default function Fleet() {
  const { ambulances, error, movementMode } = useAmbulances();
  const { emergencies } = useEmergencies();
  const { hospitals } = useHospitals();
  const hospitalName = (id) => hospitals.find((h) => h.id === id)?.name || id;
  const free = ambulances.filter((a) => a.status === 'available').length;
  const active = emergencies.filter((e) => e.ambulance_id && ['AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED'].includes(e.state));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Ambulance fleet</h1>
        <SimulatedBadge text="Simulated fleet. Sample crews." />
        <span data-testid="fleet-summary" className="ml-auto text-xl font-semibold">
          {free} of {ambulances.length} available
        </span>
      </div>
      <p data-testid="fleet-movement" className="text-slate-600">
        {movementText(movementMode === 'true' ? 'portal' : movementMode === 'false' ? 'backend' : USE_MOCK ? 'portal' : 'auto')}
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full text-left text-lg">
          <thead className="bg-slate-100 text-sm uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Crew</th>
              <th className="px-4 py-3">Base</th>
              <th className="px-4 py-3">Current emergency</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {ambulances.map((a) => {
              const [label, style] = STATUS[a.status];
              const e = emergencies.find((x) => x.emergency_id === a.emergency_id);
              return (
                <tr key={a.id} data-testid="fleet-row" data-id={a.id} data-status={a.status} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <b>{a.call_sign}</b> <span className="text-slate-500">({a.id})</span>
                  </td>
                  <td className="px-4 py-3 text-base">
                    Driver: {a.crew?.driver}<br />Paramedic: {a.crew?.paramedic}
                  </td>
                  <td className="px-4 py-3 text-base">{hospitalName(a.base_hospital_id)}</td>
                  <td className="px-4 py-3">
                    {e ? (
                      <>
                        <b>{e.emergency_id}</b> · {TYPE_LABELS[e.type] || e.type}
                        {a.status === 'en_route' && e.ambulance?.eta_seconds != null && (
                          <span className="block text-base text-slate-600">ETA {formatEta(e.ambulance.eta_seconds)} (simulated)</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-3 py-1 text-base font-bold ${style}`}>{label}</span>
                  </td>
                </tr>
              );
            })}
            {ambulances.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-500">No ambulances loaded.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-3 text-2xl font-bold">Active trips ({active.length})</h2>
        {active.length === 0 && <p className="rounded-2xl bg-white p-6 text-slate-500 shadow">No ambulance is out. Dispatch one from the Dashboard.</p>}
        <div className="grid gap-6 xl:grid-cols-2">
          {active.map((e) => (
            <div key={e.emergency_id} className="rounded-2xl bg-white p-4 shadow">
              <h3 className="mb-2 text-xl font-bold">{e.emergency_id} · {TYPE_LABELS[e.type] || e.type}</h3>
              <TrackingMap emergency={e} compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
