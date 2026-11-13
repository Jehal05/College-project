import { NOT_SHARED } from '../../services/adapters.js';
import { formatTime } from '../AlertCard.jsx';

/** Patient ID, emergency ID, alert time and location. Missing data reads "Not shared". */
export default function PatientFacts({ emergency: e }) {
  return (
    <dl className="grid grid-cols-2 gap-4 text-lg">
      <div><dt className="text-sm text-slate-500">Patient ID</dt><dd className="font-semibold">{e.patient_id ?? NOT_SHARED}</dd></div>
      <div><dt className="text-sm text-slate-500">Emergency ID</dt><dd className="font-semibold">{e.emergency_id}</dd></div>
      <div><dt className="text-sm text-slate-500">Alert time</dt><dd className="font-semibold">{formatTime(e.created_at)}</dd></div>
      <div>
        <dt className="text-sm text-slate-500">Location</dt>
        <dd className="font-semibold">
          {e.location ? `${e.location.lat.toFixed(4)}, ${e.location.lng.toFixed(4)} (±${e.location.accuracy_m ?? e.location.accuracy ?? '?'} m)` : 'Not shared'}
        </dd>
      </div>
    </dl>
  );
}
