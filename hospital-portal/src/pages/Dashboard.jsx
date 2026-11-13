import { useEffect, useState } from 'react';
import { USE_MOCK, mockCreateEmergency } from '../services/api.js';
import { isFinal } from '../services/stateMachine.js';
import { useAuth } from '../components/AuthProvider.jsx';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import AlertCard from '../components/AlertCard.jsx';
import EmergencyDetail from '../components/EmergencyDetail.jsx';
import ConnectionBadge from '../components/ConnectionBadge.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import hospitals from '../data/hospitals.json';

export default function Dashboard() {
  const { session } = useAuth();
  const { emergencies, loading, error, refresh } = useEmergencies();
  const hospital = hospitals.find((h) => h.id === session?.hospital_id) || hospitals[0];
  const [selectedId, setSelectedId] = useState(null);

  const selected = emergencies.find((e) => e.emergency_id === selectedId) || null;
  const openCount = emergencies.filter((e) => !isFinal(e.state)).length;

  // Select the top alert when nothing is selected yet.
  useEffect(() => {
    if (!selected && emergencies.length > 0) setSelectedId(emergencies[0].emergency_id);
  }, [selected, emergencies]);

  // With the real backend, fetch the full details and timeline of the selected emergency.
  useEffect(() => {
    if (!USE_MOCK && selectedId) refresh(selectedId);
  }, [selectedId, refresh]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-300 bg-white px-6 py-3">
        <h1 className="text-2xl font-bold">{hospital.name}</h1>
        <SimulatedBadge text="Simulated event. Not a medical diagnosis." />
        <ConnectionBadge />
        {USE_MOCK && (
          <button
            onClick={() => mockCreateEmergency()}
            className="ml-auto rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
          >
            + Simulate new alert
          </button>
        )}
      </div>

      {error && <p role="alert" className="mx-6 mt-4 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[440px_1fr]">
        {/* Left: alert queue */}
        <section>
          <h2 className="mb-3 text-xl font-bold">
            Alert queue <span data-testid="open-count" className="text-slate-500">({openCount} open)</span>
          </h2>
          {loading && emergencies.length === 0 && <p className="text-slate-500">Loading alerts…</p>}
          {!loading && emergencies.length === 0 && <p className="text-slate-500">No active alerts.</p>}
          <div className="space-y-3">
            {emergencies.map((e) => (
              <AlertCard
                key={e.emergency_id}
                alert={e}
                selected={e.emergency_id === selectedId}
                onSelect={(a) => setSelectedId(a.emergency_id)}
              />
            ))}
          </div>
        </section>

        {/* Right: detail panel */}
        <section className="rounded-2xl bg-white p-6 shadow">
          {selected ? <EmergencyDetail emergency={selected} /> : <p className="text-slate-500">Select an alert to see its details.</p>}
        </section>
      </div>
    </div>
  );
}
