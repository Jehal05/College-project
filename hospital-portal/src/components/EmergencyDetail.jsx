import { useState } from 'react';
import { SEVERITY_STYLES, STATE_LABELS, TYPE_LABELS } from '../services/contract.js';
import { canCancel } from '../services/stateMachine.js';
import { USE_MOCK, mockPatientCancel } from '../services/api.js';
import { formatTime } from './AlertCard.jsx';
import ActionButtons from './ActionButtons.jsx';
import PatientMiniMap from './PatientMiniMap.jsx';
import Timeline from './Timeline.jsx';

/** Right-hand panel of the dashboard: patient summary, map, actions and timeline. */
export default function EmergencyDetail({ emergency }) {
  const [cancelError, setCancelError] = useState('');
  const e = emergency;
  const last = e.status_events[e.status_events.length - 1];
  const cancelled = e.state === 'CANCELLED';

  async function cancelAsPatient() {
    setCancelError('');
    try {
      await mockPatientCancel(e.emergency_id);
    } catch (err) {
      setCancelError(err.message);
    }
  }

  return (
    <div data-testid="detail-panel" className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-bold">{TYPE_LABELS[e.type] || e.type}</h2>
        <span className={`rounded-full px-3 py-1 font-bold ${SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.NONE}`}>{e.severity}</span>
        <span data-testid="detail-state" className={`rounded-lg px-3 py-1 font-semibold ${cancelled ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {STATE_LABELS[e.state] || e.state}
        </span>
      </div>

      {cancelled && (
        <p className="rounded-xl bg-slate-800 p-4 text-lg font-semibold text-white">
          The patient cancelled this alert (false alarm). No ambulance may be dispatched.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 text-lg">
            <div><dt className="text-sm text-slate-500">Patient ID</dt><dd className="font-semibold">{e.patient_id}</dd></div>
            <div><dt className="text-sm text-slate-500">Emergency ID</dt><dd className="font-semibold">{e.emergency_id}</dd></div>
            <div><dt className="text-sm text-slate-500">Alert time</dt><dd className="font-semibold">{formatTime(e.created_at)}</dd></div>
            <div>
              <dt className="text-sm text-slate-500">Location</dt>
              <dd className="font-semibold">
                {e.location ? `${e.location.lat.toFixed(4)}, ${e.location.lng.toFixed(4)} (±${e.location.accuracy_m ?? '?'} m)` : 'Not shared'}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 font-semibold">Reported symptoms</h3>
            <div className="flex flex-wrap gap-2">
              {(e.symptoms || []).map((s) => (
                <span key={s} className="rounded-lg bg-red-50 px-3 py-1 font-medium text-red-800">{s}</span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Vitals</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Heart rate', e.vitals?.heart_rate, 'bpm'],
                ['SpO₂', e.vitals?.spo2, '%'],
                ['Blood pressure', e.vitals?.bp, ''],
              ].map(([label, value, unit]) => (
                <div key={label} className="rounded-xl bg-slate-100 p-3">
                  <div className="text-sm text-slate-500">{label}</div>
                  <div className="text-2xl font-bold">{value ?? '–'} <span className="text-base font-normal">{unit}</span></div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Patient location</h3>
            <PatientMiniMap location={e.location} />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 font-semibold">Actions</h3>
            <ActionButtons emergency={e} />
            {last && (
              <p data-testid="last-action" className="mt-3 text-slate-600">
                Last update: <b>{STATE_LABELS[last.state] || last.state}</b>
                {last.actor ? <> by <b>{last.actor}</b></> : null} at {formatTime(last.timestamp)}
              </p>
            )}
            {USE_MOCK && canCancel(e.state) && (
              <button
                data-testid="mock-cancel"
                onClick={cancelAsPatient}
                className="mt-3 rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 px-4 py-2 font-semibold text-amber-900 hover:bg-amber-100"
              >
                Mock: patient presses “I’m OK” (cancel)
              </button>
            )}
            {cancelError && <p role="alert" className="mt-2 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{cancelError}</p>}
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Response timeline</h3>
            <Timeline events={e.status_events} createdAt={e.created_at} />
          </div>
        </div>
      </div>
    </div>
  );
}
