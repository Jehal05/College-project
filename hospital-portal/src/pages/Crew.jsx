// Crew side of the desk and crew chat (feature #49).
// Open /crew/<emergency id> in a second browser tab to talk to the hospital desk.
import { useParams } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import { TYPE_LABELS, STATE_LABELS } from '../services/contract.js';

export default function Crew() {
  const { emergencyId } = useParams();
  const { emergencies } = useEmergencies();
  const e = emergencies.find((x) => x.emergency_id === emergencyId);

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Ambulance crew view</h1>
          <SimulatedBadge text="Simulated event. Not a medical diagnosis." />
        </div>
        <p className="text-lg">
          Emergency <b data-testid="crew-emergency">{emergencyId}</b>
          {e && (
            <span className="text-slate-600"> · {TYPE_LABELS[e.type] || e.type} · {STATE_LABELS[e.state] || e.state}</span>
          )}
        </p>
        <ChatPanel emergencyId={emergencyId} role="crew" senderName="Ambulance crew (simulated)" />
      </div>
    </div>
  );
}
