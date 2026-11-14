import { SEVERITY_STYLES } from '../services/contract.js';
import { nextHospital } from '../services/escalation.js';
import { useRanking } from './useRanking.js';
import EscalationCountdown from './EscalationCountdown.jsx';
import { isEarly } from '../services/stateMachine.js';
import { originText } from '../services/adapters.js';
import { shouldFlash, showNewBadge } from '../services/alertFlags.js';
import { elsewhereName } from '../services/queueScope.js';
import { cardWarning, cardWarningCode } from '../services/capacity.js';
import { isFinal } from '../services/stateMachine.js';
import { useAuth } from './AuthProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';
import { useT } from '../i18n/index.js';
import { stateText, severityText, typeText } from '../i18n/phrases.js';

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * One alert in the queue (feature #9): patient ID, emergency type, severity,
 * symptoms, vitals, location, alert time and the current state.
 */
export default function AlertCard({ alert, selected, onSelect }) {
  const { emergency_id, patient_id, type, severity, symptoms, location, created_at, state } = alert;
  const vitals = alert.vitals || {};
  const t = useT();
  const early = isEarly(state);
  const { session } = useAuth();
  const { hospitals } = useHospitals();
  const elsewhereHospital = elsewhereName(alert, session?.hospital_id, hospitals);
  const elsewhere = elsewhereHospital === null ? null : t('card.nowAt', { name: elsewhereHospital });
  const ownHospital = hospitals.find((h) => h.id === String(session?.hospital_id));
  const warning = !elsewhere && !isFinal(state) ? cardWarning(alert, ownHospital) : null;
  const warningCode = warning ? cardWarningCode(alert, ownHospital) : null;
  const fromCheckIn = originText(alert);
  const ranking = useRanking(type, location);
  const hasNext = Boolean(ranking && nextHospital(ranking.ranked, alert));
  const unread = !alert._read && state !== 'CANCELLED' && state !== 'HANDOVER_DONE' && !early;
  const cancelled = state === 'CANCELLED';
  const finished = state === 'HANDOVER_DONE';
  // Flash for a few seconds after it BECAME a real SOS here (not from when the case was first created).
  const flash = shouldFlash(alert);
  const isNew = showNewBadge(alert);
  const border = cancelled || finished || early
    ? 'border-slate-400'
    : severity === 'EMERGENCY' ? 'border-red-600' : severity === 'URGENT' ? 'border-orange-500' : 'border-yellow-400';

  return (
    <button
      data-testid="alert-card"
      data-id={emergency_id}
      data-state={state}
      data-unread={unread ? 'true' : 'false'}
      data-early={early ? 'true' : 'false'}
      data-new={isNew ? 'true' : 'false'}
      onClick={() => onSelect?.(alert)}
      className={`w-full rounded-2xl border-l-8 bg-white p-4 text-left shadow transition hover:shadow-md ${border} ${
        selected ? 'ring-4 ring-sky-400' : ''
      } ${cancelled || finished ? 'opacity-70' : ''} ${early ? 'bg-slate-50' : ''} ${flash ? 'ht-flash' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-2 text-xl font-bold ${cancelled ? 'line-through' : ''}`}>
          {unread && <span title={t('card.notOpened')} className="h-3.5 w-3.5 shrink-0 rounded-full bg-sky-500" />}
          {typeText(t, type)}
          {isNew && <span data-testid="new-badge" className="rounded bg-sky-600 px-1.5 py-0.5 text-xs font-bold text-white">{t('card.new')}</span>}
        </span>
        {cancelled ? (
          <span className="rounded-full bg-slate-700 px-3 py-0.5 text-sm font-bold text-white">{t('card.cancelled')}</span>
        ) : (
          <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.NONE}`}>{severityText(t, severity)}{alert.severity_missing ? '?' : ''}</span>
        )}
      </div>
      <div className="mt-1 text-slate-600">
        {t('card.patient')} <b>{patient_id ?? t('common.notShared')}</b> · {emergency_id} · {formatTime(created_at)}
      </div>
      <div className="mt-2 text-slate-800" data-testid="card-symptoms">{fromCheckIn || (symptoms || []).join(', ') || t('common.notShared')}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 text-slate-600">
        <span>{t('card.hr')} {vitals.heart_rate ?? '–'}</span>
        <span>SpO₂ {vitals.spo2 ?? '–'}%</span>
        <span>{t('card.bp')} {vitals.bp ?? '–'}</span>
        <span className="ml-auto text-sm text-slate-500">
          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : t('card.locationNotShared')}
        </span>
      </div>
      <div className="mt-2 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
        {stateText(t, state)}
      </div>
      {alert.severity_missing && !cancelled && <div data-testid="severity-missing" className="mt-2 rounded bg-amber-100 px-2 py-1 text-sm font-bold text-amber-900">{t('severity.missing')}</div>}
      {warning && <div data-testid="card-warning" className="mt-2 rounded bg-red-50 px-2 py-1 text-sm font-bold text-red-800">{warningCode ? t(`warn.card.${warningCode}`) : `Warning: your ${warning}`}</div>}
      {elsewhere && <div data-testid="elsewhere" className="mt-2 text-sm font-semibold text-slate-600">{elsewhere}</div>}
      {fromCheckIn && !early && !cancelled && (
        <div data-testid="checkin-note" className="mt-2 text-sm text-slate-600">{t('card.checkin')}</div>
      )}
      <div className="mt-2 empty:hidden">
        <EscalationCountdown emergency={alert} hasNext={hasNext} />
      </div>
    </button>
  );
}
