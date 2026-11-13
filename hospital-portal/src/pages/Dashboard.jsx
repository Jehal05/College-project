import { useEffect, useState } from 'react';
import { getAlerts } from '../services/api.js';
import { subscribe, emitMock } from '../services/socket.js';
import { USE_MOCK } from '../services/api.js';
import { useAuth } from '../components/AuthProvider.jsx';
import AlertCard, { formatTime } from '../components/AlertCard.jsx';
import Timeline from '../components/Timeline.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { SEVERITY_STYLES, TYPE_LABELS } from '../services/contract.js';
import hospitals from '../data/hospitals.json';

export default function Dashboard() {
  const { session } = useAuth();
  const hospital = hospitals.find((h) => h.id === session?.hospital_id) || hospitals[0];
  const [alerts, setAlerts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial list (mock JSON in Phase 1).
  useEffect(() => {
    let alive = true;
    getAlerts()
      .then((list) => {
        if (!alive) return;
        setAlerts(list);
        setSelectedId(list[0]?.emergency_id ?? null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Live alerts. The real WebSocket is connected in Phase 2; the subscription is ready now.
  useEffect(
    () =>
      subscribe('emergency.created', (msg) => {
        const alert = { emergency_id: msg.emergency_id, state: msg.state, created_at: msg.timestamp, ...msg.payload };
        setAlerts((prev) => (prev.some((a) => a.emergency_id === alert.emergency_id) ? prev : [alert, ...prev]));
      }),
    [],
  );

  function simulateAlert() {
    const id = `E-${Math.floor(2000 + Math.random() * 8000)}`;
    emitMock('emergency.created', {
      emergency_id: id,
      state: 'SOS_SENT',
      payload: {
        patient_id: 'P-501',
        type: 'DIABETIC',
        severity: 'URGENT',
        symptoms: ['Confusion', 'Shaking', 'Sweating'],
        vitals: { heart_rate: 104, spo2: 97, bp: '118/76' },
        location: { lat: 23.0301, lng: 72.5802, accuracy_m: 20 },
      },
    });
  }

  const selected = alerts.find((a) => a.emergency_id === selectedId) || null;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-300 bg-white px-6 py-3">
        <h1 className="text-2xl font-bold">{hospital.name}</h1>
        <SimulatedBadge text="Simulated event. Not a medical diagnosis." />
        {USE_MOCK && (
          <button
            onClick={simulateAlert}
            className="ml-auto rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
          >
            + Simulate new alert
          </button>
        )}
      </div>

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[440px_1fr]">
        {/* Left: alert queue */}
        <section>
          <h2 className="mb-3 text-xl font-bold">
            Alert queue <span className="text-slate-500">({alerts.length})</span>
          </h2>
          {loading && <p className="text-slate-500">Loading alerts…</p>}
          {!loading && alerts.length === 0 && <p className="text-slate-500">No active alerts.</p>}
          <div className="space-y-3">
            {alerts.map((a) => (
              <AlertCard
                key={a.emergency_id}
                alert={a}
                selected={a.emergency_id === selectedId}
                onSelect={(al) => setSelectedId(al.emergency_id)}
              />
            ))}
          </div>
        </section>

        {/* Right: detail panel */}
        <section className="rounded-2xl bg-white p-6 shadow">
          {!selected ? (
            <p className="text-slate-500">Select an alert to see its details.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-bold">{TYPE_LABELS[selected.type] || selected.type}</h2>
                <span className={`rounded-full px-3 py-1 font-bold ${SEVERITY_STYLES[selected.severity]}`}>
                  {selected.severity}
                </span>
                <span className="font-mono text-slate-500">{selected.state}</span>
              </div>

              <dl className="grid gap-4 text-lg sm:grid-cols-2">
                <div><dt className="text-sm text-slate-500">Patient ID</dt><dd className="font-semibold">{selected.patient_id}</dd></div>
                <div><dt className="text-sm text-slate-500">Emergency ID</dt><dd className="font-semibold">{selected.emergency_id}</dd></div>
                <div><dt className="text-sm text-slate-500">Alert time</dt><dd className="font-semibold">{formatTime(selected.created_at)}</dd></div>
                <div>
                  <dt className="text-sm text-slate-500">Location</dt>
                  <dd className="font-semibold">
                    {selected.location
                      ? `${selected.location.lat.toFixed(4)}, ${selected.location.lng.toFixed(4)} (±${selected.location.accuracy_m} m)`
                      : 'Not shared'}
                  </dd>
                </div>
              </dl>

              <div>
                <h3 className="mb-2 font-semibold">Reported symptoms</h3>
                <div className="flex flex-wrap gap-2">
                  {(selected.symptoms || []).map((s) => (
                    <span key={s} className="rounded-lg bg-red-50 px-3 py-1 font-medium text-red-800">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Vitals</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Heart rate', selected.vitals?.heart_rate, 'bpm'],
                    ['SpO₂', selected.vitals?.spo2, '%'],
                    ['Blood pressure', selected.vitals?.bp, ''],
                  ].map(([label, value, unit]) => (
                    <div key={label} className="rounded-xl bg-slate-100 p-3">
                      <div className="text-sm text-slate-500">{label}</div>
                      <div className="text-2xl font-bold">{value ?? '–'} <span className="text-base font-normal">{unit}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {['Acknowledge', 'Dispatch', 'Arrived', 'Handed over'].map((label) => (
                    <button
                      key={label}
                      disabled
                      title="Wired up in Phase 2 (feature #10)"
                      className="cursor-not-allowed rounded-lg bg-slate-200 px-5 py-3 text-lg font-bold text-slate-500"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-500">Buttons become active in Phase 2 (feature #10).</p>
              </div>

              <Timeline />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
