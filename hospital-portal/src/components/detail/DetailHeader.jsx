import { SEVERITY_STYLES, TYPE_LABELS } from '../../services/contract.js';
import { isEarly } from '../../services/stateMachine.js';
import { originText } from '../../services/adapters.js';
import { useT } from '../../i18n/index.js';
import { stateText, severityText } from '../../i18n/phrases.js';

/** Title row and the banners that explain the state (cancelled, early notice, safety check-in, escalated). */
export default function DetailHeader({ emergency: e, escalatedTo }) {
  const t = useT();
  const cancelled = e.state === 'CANCELLED';
  const early = isEarly(e.state);
  const cancelledEarly = cancelled && !e.status_events.some((s) => s.state === 'SOS_SENT');
  const fromCheckIn = originText(e);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-bold">{TYPE_LABELS[e.type] || e.type}</h2>
        <span className={`rounded-full px-3 py-1 font-bold ${SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.NONE}`}>{severityText(t, e.severity)}{e.severity_missing ? '?' : ''}</span>
        <span data-testid="detail-state" className={`rounded-lg px-3 py-1 font-semibold ${cancelled ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {stateText(t, e.state)}
        </span>
      </div>

      {e.severity_missing && !cancelled && (
        <p data-testid="severity-missing-detail" className="rounded-xl bg-amber-100 p-3 text-lg font-semibold text-amber-900">{t('severity.missing')}</p>
      )}

      {cancelled && (
        <p data-testid="cancelled-banner" className="rounded-xl bg-slate-800 p-4 text-lg font-semibold text-white">
          {cancelledEarly
            ? t('banner.cancelledEarly')
            : t('banner.cancelled')}
        </p>
      )}

      {early && (
        <p data-testid="early-banner" className="rounded-xl bg-slate-200 p-4 text-lg font-semibold text-slate-800">
          {t('banner.early')}
        </p>
      )}

      {fromCheckIn && (
        <p data-testid="checkin-banner" className="rounded-xl bg-sky-50 p-4 text-lg font-semibold text-sky-900">{fromCheckIn}</p>
      )}

      {e.state === 'ESCALATED' && (
        <p data-testid="escalation-banner" className="rounded-xl bg-orange-500 p-4 text-lg font-bold text-white">
          {t('banner.escalated', { name: escalatedTo || t('banner.nextOnList') })}
        </p>
      )}
    </>
  );
}
