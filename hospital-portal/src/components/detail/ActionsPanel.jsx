import { useState } from 'react';
import { canCancel, isEarly } from '../../services/stateMachine.js';
import { canEscalate } from '../../services/escalation.js';
import { USE_MOCK, mockPatientCancel, mockEscalate, mockConfirmSos } from '../../services/api.js';
import { formatTime } from '../AlertCard.jsx';
import ActionButtons from '../ActionButtons.jsx';
import EscalationCountdown from '../EscalationCountdown.jsx';
import { useT } from '../../i18n/index.js';
import { usePresenting } from '../usePresenting.js';
import { stateText } from '../../i18n/phrases.js';

const MOCK_BUTTON = 'mt-3 rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 px-4 py-2 font-semibold text-amber-900 hover:bg-amber-100';

/** Action buttons, escalation countdown, last update and the mock-only helper buttons. `next` is the next hospital on the list (or null). */
export default function ActionsPanel({ emergency: e, next }) {
  const [error, setError] = useState('');
  const t = useT();
  const presenting = usePresenting(); // always called, never behind &&
  const helpers = USE_MOCK && !presenting; // mock helper buttons are hidden in presentation mode
  const last = e.status_events[e.status_events.length - 1];

  async function run(fn) {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h3 className="mb-2 font-semibold">{t('detail.actions')}</h3>
      <ActionButtons emergency={e} />
      <div className="mt-3 empty:hidden">
        <EscalationCountdown emergency={e} hasNext={Boolean(next)} large />
      </div>
      {last && (
        <p data-testid="last-action" className="mt-3 text-slate-600">
          {t('detail.lastUpdate')} <b>{last.state === 'NOTE' ? last.note : stateText(t, last.state)}</b>
          {last.actor ? <> {t('detail.by')} <b>{last.actor}</b></> : null} {t('detail.at')} {formatTime(last.timestamp)}
        </p>
      )}
      {helpers && canCancel(e.state) && (
        <button data-testid="mock-cancel" onClick={() => run(() => mockPatientCancel(e.emergency_id))} className={MOCK_BUTTON}>
          {t('ctl.mockCancel')}
        </button>
      )}
      {helpers && isEarly(e.state) && (
        <button data-testid="mock-confirm-sos" onClick={() => run(() => mockConfirmSos(e.emergency_id))} className={MOCK_BUTTON}>
          {t('ctl.mockConfirm')}
        </button>
      )}
      {helpers && canEscalate(e.state) && next && (
        <button data-testid="mock-escalate" onClick={() => run(() => mockEscalate(e.emergency_id))} className={`${MOCK_BUTTON} ml-0 sm:ml-3`}>
          {t('ctl.mockEscalate')}
        </button>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
    </div>
  );
}
