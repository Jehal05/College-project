// Crew side of the desk and crew chat (feature #49).
// Open /crew/<emergency id> in a second browser tab to talk to the hospital desk.
import { useParams } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import { TYPE_LABELS } from '../services/contract.js';
import { useT } from '../i18n/index.js';
import { stateText } from '../i18n/phrases.js';

export default function Crew() {
  const { emergencyId } = useParams();
  const t = useT();
  const { emergencies } = useEmergencies();
  const e = emergencies.find((x) => x.emergency_id === emergencyId);

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{t('crew.title')}</h1>
          <SimulatedBadge text={t('dash.simulatedEvent')} />
        </div>
        <p className="text-lg">
          {t('crew.emergency')} <b data-testid="crew-emergency">{emergencyId}</b>
          {e && (
            <span className="text-slate-600"> · {TYPE_LABELS[e.type] || e.type} · {stateText(t, e.state)}</span>
          )}
        </p>
        <ChatPanel emergencyId={emergencyId} role="crew" senderName="Ambulance crew (simulated)" />
      </div>
    </div>
  );
}
