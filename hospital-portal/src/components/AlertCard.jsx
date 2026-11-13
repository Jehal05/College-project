import { SEVERITY_STYLES, STATE_LABELS, TYPE_LABELS } from '../services/contract.js';

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * One alert in the queue (feature #9): patient ID, emergency type, severity,
 * symptoms, vitals, location, alert time and the current state.
 */
export default function AlertCard({ alert, selected, onSelect }) {
  const { emergency_id, patient_id, type, severity, symptoms = [], vitals = {}, location, created_at, state } = alert;
  const cancelled = state === 'CANCELLED';
  const finished = state === 'HANDOVER_DONE';
  // Flash only alerts that arrived live in the last few seconds (not on every page visit).
  const flash = alert._new && Date.now() - new Date(created_at).getTime() < 5000;
  const border = cancelled || finished
    ? 'border-slate-400'
    : severity === 'EMERGENCY' ? 'border-red-600' : severity === 'URGENT' ? 'border-orange-500' : 'border-yellow-400';

  return (
    <button
      data-testid="alert-card"
      data-id={emergency_id}
      data-state={state}
      onClick={() => onSelect?.(alert)}
      className={`w-full rounded-2xl border-l-8 bg-white p-4 text-left shadow transition hover:shadow-md ${border} ${
        selected ? 'ring-4 ring-sky-400' : ''
      } ${cancelled || finished ? 'opacity-70' : ''} ${flash ? 'ht-flash' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xl font-bold ${cancelled ? 'line-through' : ''}`}>{TYPE_LABELS[type] || type}</span>
        {cancelled ? (
          <span className="rounded-full bg-slate-700 px-3 py-0.5 text-sm font-bold text-white">CANCELLED</span>
        ) : (
          <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.NONE}`}>{severity}</span>
        )}
      </div>
      <div className="mt-1 text-slate-600">
        Patient <b>{patient_id}</b> · {emergency_id} · {formatTime(created_at)}
      </div>
      <div className="mt-2 text-slate-800">{symptoms.join(', ')}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 text-slate-600">
        <span>HR {vitals.heart_rate ?? '–'}</span>
        <span>SpO₂ {vitals.spo2 ?? '–'}%</span>
        <span>BP {vitals.bp ?? '–'}</span>
        <span className="ml-auto text-sm text-slate-500">
          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'No location'}
        </span>
      </div>
      <div className="mt-2 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
        {STATE_LABELS[state] || state}
      </div>
    </button>
  );
}
