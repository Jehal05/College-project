import { SEVERITY_STYLES, TYPE_LABELS } from '../services/contract.js';

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * One alert in the queue (feature #9).
 * Props follow the contract: patient ID, emergency type, severity, symptoms,
 * vitals, location and alert time.
 */
export default function AlertCard({ alert, selected, onSelect }) {
  const { emergency_id, patient_id, type, severity, symptoms = [], vitals = {}, location, created_at, state } = alert;

  return (
    <button
      onClick={() => onSelect?.(alert)}
      className={`w-full rounded-2xl border-l-8 bg-white p-4 text-left shadow transition hover:shadow-md ${
        severity === 'EMERGENCY' ? 'border-red-600' : severity === 'URGENT' ? 'border-orange-500' : 'border-yellow-400'
      } ${selected ? 'ring-4 ring-sky-400' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xl font-bold">{TYPE_LABELS[type] || type}</span>
        <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${SEVERITY_STYLES[severity]}`}>{severity}</span>
      </div>
      <div className="mt-1 text-slate-600">
        Patient <b>{patient_id}</b> · {emergency_id} · {formatTime(created_at)}
      </div>
      <div className="mt-2 text-slate-800">{symptoms.join(', ')}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 text-slate-600">
        <span>HR {vitals.heart_rate ?? '–'}</span>
        <span>SpO₂ {vitals.spo2 ?? '–'}%</span>
        <span>BP {vitals.bp ?? '–'}</span>
      </div>
      <div className="mt-1 flex justify-between text-sm text-slate-500">
        <span>
          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'No location'}
        </span>
        <span className="font-mono">{state}</span>
      </div>
    </button>
  );
}
