// "Digital twin" bar: live vitals next to the person's own usual range, in neutral words.
// It is not a diagnosis and shows no score. Blue = within usual range, amber = just a notice (not an alarm).
import { useTranslation } from 'react-i18next';
import { twinRows } from '../utils/twin';
import ErrorMessage from './ErrorMessage';

export default function DigitalTwinBar({ vitals, baseline, status, onRetry }) {
  const { t } = useTranslation();
  let body;
  if (status === 'error') body = <ErrorMessage onRetry={onRetry} retryLabel={t('common.retry')}>{t('twin.error')}</ErrorMessage>;
  else if (!baseline || !vitals) body = <div role="status" className="h-24 animate-pulse rounded-lg bg-slate-100"><span className="sr-only">{t('twin.loading')}</span></div>;
  else {
    body = (
      <ul className="grid grid-cols-2 gap-2">
        {twinRows(vitals, baseline).map((r) => (
          <li key={r.key} className={'rounded-lg border-l-4 bg-slate-50 p-2 ' + (r.within === false ? 'border-amber-500' : 'border-blue-600')}>
            <p className="text-sm text-slate-700">{t('twin.' + r.key)}</p>
            <p className="text-2xl font-bold text-slate-900">{r.value}</p>
            <p className="text-xs text-slate-700">{t('twin.usual', { range: r.usual })}</p>
            {r.within !== null && <p className="text-sm font-semibold text-slate-900">{r.within ? t('twin.within') : t('twin.different')}</p>}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <section aria-label={t('twin.title')} className="mt-4 rounded-xl border border-slate-200 p-4">
      <h2 className="mb-2 text-lg font-bold">{t('twin.title')}</h2>
      {body}
      <p className="mt-2 text-sm text-slate-700">{t('twin.notDiagnosis')}</p>
    </section>
  );
}
