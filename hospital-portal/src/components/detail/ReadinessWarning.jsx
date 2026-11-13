import { useAuth } from '../AuthProvider.jsx';
import { useHospitals } from '../HospitalProvider.jsx';
import { readinessWarnings } from '../../services/capacity.js';
import { isElsewhere } from '../../services/queueScope.js';
import { isFinal } from '../../services/stateMachine.js';

/** "Your cath lab is not ready for this alert" and similar. Only for open alerts held by this desk's hospital. */
export default function ReadinessWarning({ emergency: e }) {
  const { session } = useAuth();
  const { hospitals } = useHospitals();
  if (isFinal(e.state) || isElsewhere(e, session?.hospital_id)) return null;
  const warnings = readinessWarnings(e, hospitals.find((h) => h.id === String(session?.hospital_id)));
  if (warnings.length === 0) return null;
  return (
    <ul data-testid="capacity-warning" aria-label="Readiness warnings" className="space-y-2">
      {warnings.map((w) => (
        <li key={w.code} data-level={w.level} className={`rounded-xl p-4 text-lg font-bold ${w.level === 'warning' ? 'border-2 border-red-700 bg-red-50 text-red-900' : 'bg-slate-100 font-semibold text-slate-700'}`}>
          {w.level === 'warning' ? 'Warning: ' : 'Note: '}{w.text}
        </li>
      ))}
    </ul>
  );
}
