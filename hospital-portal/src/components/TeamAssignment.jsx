// Team assignment (feature #46): assign an on-call doctor or team from the hospital's roster.
// The choice is stored on the emergency and shown on the timeline.
import { useState } from 'react';
import roster from '../data/roster.json';
import { SPECIALTY_FOR_TYPE } from '../services/contract.js';
import { useAuth } from './AuthProvider.jsx';
import { useEmergencies } from './EmergencyProvider.jsx';
import { useT } from '../i18n/index.js';

// The choice starts from the current assignment (or the suggested specialty) and starts again when the case or the assignment changes (key).
export default function TeamAssignment({ emergency }) {
  return <TeamAssignmentBody key={`${emergency.emergency_id}|${emergency.assigned_team?.id || ''}`} emergency={emergency} />;
}

function TeamAssignmentBody({ emergency }) {
  const t = useT();
  const { session } = useAuth();
  const { addNote } = useEmergencies();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const e = emergency;
  const suggested = SPECIALTY_FOR_TYPE[e.type];
  const staff = [...(roster[session?.hospital_id] || [])].sort(
    (a, b) => (b.specialty === suggested) - (a.specialty === suggested) || a.name.localeCompare(b.name),
  );
  const current = e.assigned_team || null;
  const readOnly = e.state === 'CANCELLED' || e.state === 'HANDOVER_DONE';
  // Preselect the current assignment, or the first person with the fitting specialty.
  const [choice, setChoice] = useState(() => current?.id || staff.find((s) => s.specialty === suggested)?.id || staff[0]?.id || '');


  async function assign() {
    const person = staff.find((s) => s.id === choice);
    if (!person) return;
    setBusy(true);
    setError('');
    try {
      await addNote(e.emergency_id, 'assignment', `Assigned to ${person.name} (${person.specialty})`, { assigned_team: person });
    } catch (err) {
      setError(`Could not assign: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (staff.length === 0) return <p className="text-slate-500">{t('team.noRoster')}</p>;

  return (
    <div data-testid="assignment">
      <p data-testid="assigned" className="mb-2 text-lg">
        {current ? (
          <>Assigned: <b>{current.name}</b> · {current.role} · {current.specialty}</>
        ) : (
          <span className="text-slate-500">Nobody assigned yet. Suggested specialty: <b>{suggested}</b></span>
        )}
      </p>
      {readOnly ? (
        <p className="font-semibold text-slate-600">{e.state === 'CANCELLED' ? 'Cancelled' : 'Handed over'}: the assignment can no longer be changed.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <select
            data-testid="assign-select"
            value={choice}
            onChange={(ev) => setChoice(ev.target.value)}
            className="min-w-0 flex-1 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-lg"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.specialty}{s.specialty === suggested ? ' (suggested)' : ''}
              </option>
            ))}
          </select>
          <button
            data-testid="assign-button"
            disabled={busy || !choice || choice === current?.id}
            onClick={assign}
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {busy ? 'Assigning…' : current ? 'Change' : 'Assign'}
          </button>
        </div>
      )}
      <p className="mt-2 text-sm text-slate-500">Sample roster. All names are invented.</p>
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
    </div>
  );
}
