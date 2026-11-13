import { SEVERITY_STYLES, STATE_LABELS, TYPE_LABELS } from '../../services/contract.js';
import { isEarly } from '../../services/stateMachine.js';
import { originText } from '../../services/adapters.js';

/** Title row and the banners that explain the state (cancelled, early notice, safety check-in, escalated). */
export default function DetailHeader({ emergency: e, escalatedTo }) {
  const cancelled = e.state === 'CANCELLED';
  const early = isEarly(e.state);
  const cancelledEarly = cancelled && !e.status_events.some((s) => s.state === 'SOS_SENT');
  const fromCheckIn = originText(e);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-bold">{TYPE_LABELS[e.type] || e.type}</h2>
        <span className={`rounded-full px-3 py-1 font-bold ${SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.NONE}`}>{e.severity}</span>
        <span data-testid="detail-state" className={`rounded-lg px-3 py-1 font-semibold ${cancelled ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {STATE_LABELS[e.state] || e.state}
        </span>
      </div>

      {cancelled && (
        <p data-testid="cancelled-banner" className="rounded-xl bg-slate-800 p-4 text-lg font-semibold text-white">
          {cancelledEarly
            ? 'The patient cancelled before the SOS was sent. Nothing is needed from the desk.'
            : 'The patient cancelled this alert (false alarm). No ambulance may be dispatched.'}
        </p>
      )}

      {early && (
        <p data-testid="early-banner" className="rounded-xl bg-slate-200 p-4 text-lg font-semibold text-slate-800">
          Early notice (simulated). The patient has not confirmed the SOS yet and can still cancel.
          Acknowledge and Dispatch unlock when the SOS is sent.
        </p>
      )}

      {fromCheckIn && (
        <p data-testid="checkin-banner" className="rounded-xl bg-sky-50 p-4 text-lg font-semibold text-sky-900">{fromCheckIn}</p>
      )}

      {e.state === 'ESCALATED' && (
        <p data-testid="escalation-banner" className="rounded-xl bg-orange-500 p-4 text-lg font-bold text-white">
          Escalated to the next hospital: {escalatedTo || 'next on the list'}. No acknowledgement was given in time.
          It can still be acknowledged.
        </p>
      )}
    </>
  );
}
