import { useState } from 'react';
import { SEVERITY_STYLES, STATE_LABELS, TYPE_LABELS } from '../services/contract.js';
import { canCancel } from '../services/stateMachine.js';
import { canEscalate, fallbackStatuses, nextHospital } from '../services/escalation.js';
import { USE_MOCK, mockPatientCancel, mockEscalate } from '../services/api.js';
import { useAuth } from './AuthProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';
import { useRanking } from './useRanking.js';
import RankingTable from './RankingTable.jsx';
import Checklist from './Checklist.jsx';
import EscalationCountdown from './EscalationCountdown.jsx';
import TrackingMap from './TrackingMap.jsx';
import TeamAssignment from './TeamAssignment.jsx';
import ChatPanel from './ChatPanel.jsx';
import NearbyHelp from './NearbyHelp.jsx';
import { Link } from 'react-router-dom';
import { isFinal } from '../services/stateMachine.js';
import { formatTime } from './AlertCard.jsx';
import ActionButtons from './ActionButtons.jsx';
import PatientMiniMap from './PatientMiniMap.jsx';
import Timeline from './Timeline.jsx';

/** Right-hand panel of the dashboard: patient summary, map, actions and timeline. */
export default function EmergencyDetail({ emergency }) {
  const [cancelError, setCancelError] = useState('');
  const { session } = useAuth();
  const { hospitals } = useHospitals();
  const e = emergency;
  const ranking = useRanking(e.type, e.location);
  const statuses = ranking ? fallbackStatuses(ranking.ranked, e) : {};
  const next = ranking ? nextHospital(ranking.ranked, e) : null;
  const escalatedTo = e.escalated_to_name || hospitals.find((h) => h.id === e.alerted_hospital_id)?.name;

  async function escalateNow() {
    setCancelError('');
    try {
      await mockEscalate(e.emergency_id);
    } catch (err) {
      setCancelError(err.message);
    }
  }
  const last = e.status_events[e.status_events.length - 1];
  const cancelled = e.state === 'CANCELLED';
  const hasAmbulance = Boolean(e.ambulance_id);

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

      {e.state === 'ESCALATED' && (
        <p data-testid="escalation-banner" className="rounded-xl bg-orange-500 p-4 text-lg font-bold text-white">
          Escalated to the next hospital: {escalatedTo || 'next on the list'}. No acknowledgement was given in time.
          It can still be acknowledged.
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
            <h3 className="mb-2 font-semibold">Reported symptoms <span className="text-sm font-normal text-slate-500">(sample content, pending doctor review)</span></h3>
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

          {!hasAmbulance && (
            <div>
              <h3 className="mb-2 font-semibold">Patient location</h3>
              <PatientMiniMap location={e.location} />
            </div>
          )}

          <div>
            <h3 className="mb-2 font-semibold">On-call team</h3>
            <TeamAssignment emergency={e} />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 font-semibold">Actions</h3>
            <ActionButtons emergency={e} />
            <div className="mt-3 empty:hidden">
              <EscalationCountdown emergency={e} hasNext={Boolean(next)} large />
            </div>
            {last && (
              <p data-testid="last-action" className="mt-3 text-slate-600">
                Last update: <b>{last.state === 'NOTE' ? last.note : STATE_LABELS[last.state] || last.state}</b>
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
            {USE_MOCK && canEscalate(e.state) && next && (
              <button
                data-testid="mock-escalate"
                onClick={escalateNow}
                className="ml-0 mt-3 rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 px-4 py-2 font-semibold text-amber-900 hover:bg-amber-100 sm:ml-3"
              >
                Mock: escalate now
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

      {hasAmbulance && (
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div>
            <h3 className="mb-2 text-xl font-bold">Ambulance tracking</h3>
            <TrackingMap emergency={e} />
          </div>
          <div>
            <h3 className="mb-2 text-xl font-bold">Desk and crew chat</h3>
            <ChatPanel emergencyId={e.emergency_id} role="desk" senderName={session?.name || 'Hospital desk'} />
          </div>
        </div>
      )}

      {isFinal(e.state) && (
        <Link data-testid="open-report" to={`/report/${e.emergency_id}?t=${encodeURIComponent(e.created_at)}`} className="inline-block rounded-lg bg-slate-800 px-5 py-3 text-lg font-bold text-white hover:bg-slate-900">
          Open post-event report
        </Link>
      )}

      <div>
        <h3 className="mb-2 text-xl font-bold">Nearby help</h3>
        <NearbyHelp emergency={e} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xl font-bold">Pre-arrival checklist</h3>
          <Checklist emergency={e} />
        </div>
        <div>
          <h3 className="mb-2 text-xl font-bold">Hospital ranking and fallback order</h3>
          <RankingTable ranking={ranking} statuses={statuses} ownHospitalId={session?.hospital_id} />
        </div>
      </div>
    </div>
  );
}
