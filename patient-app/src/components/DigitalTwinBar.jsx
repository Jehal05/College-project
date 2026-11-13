// "Digital twin" bar: live vitals next to the person's own usual range, in neutral words, with a one-minute trend.
// It is not a diagnosis and shows no score. Blue = within usual range, amber = just a notice (not an alarm).
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { twinRows } from '../utils/twin';
import { bandFor, spread } from '../utils/trend';
import ErrorMessage from './ErrorMessage';
import Sparkline from './Sparkline';

// Plain-words text alternative of one sparkline, e.g. "Heart rate over the last minute: between 72 and 78, usual range 60-85."
function altText(t, row, history) {
  const main = spread(history[row.key === 'bp' ? 'bp_sys' : row.key]);
  if (!main) return '';
  if (row.key !== 'bp') return t('twin.alt', { name: t('twin.' + row.key), min: main.min, max: main.max, usual: row.usual });
  const dia = spread(history.bp_dia) || main;
  return t('twin.altBp', { smin: main.min, smax: main.max, dmin: dia.min, dmax: dia.max, usual: row.usual });
}

function Trend({ t, row, history, baseline }) {
  const key = row.key === 'bp' ? 'bp_sys' : row.key;
  const values = history[key];
  if (values.length < 2) return <p className="mt-1 text-xs text-slate-700">{t('twin.collecting')}</p>;
  return <Sparkline values={values} second={row.key === 'bp' ? history.bp_dia : null} band={bandFor(key, baseline)} label={altText(t, row, history)} />;
}

export default function DigitalTwinBar({ vitals, baseline, status, onRetry, history, sharing, sharingOff }) {
  const { t } = useTranslation();
  let body;
  if (status === 'error') body = <ErrorMessage onRetry={onRetry} retryLabel={t('common.retry')}>{t('twin.error')}</ErrorMessage>;
  else if (!baseline || !vitals) body = <div role="status" className="h-24 animate-pulse rounded-lg bg-slate-100"><span className="sr-only">{t('twin.loading')}</span></div>;
  else {
    body = (
      <ul className="grid grid-cols-1 gap-2 min-[260px]:grid-cols-2">
        {twinRows(vitals, baseline).map((r) => (
          <li key={r.key} className={'rounded-lg border-l-4 bg-slate-50 p-2 ' + (r.within === false ? 'border-amber-500' : 'border-blue-600')}>
            <p className="text-sm text-slate-700">{t('twin.' + r.key)}</p>
            <p className="text-2xl font-bold text-slate-900">{r.value}</p>
            <p className="text-xs text-slate-700">{t('twin.usual', { range: r.usual })}</p>
            {r.within !== null && <p className="text-sm font-semibold text-slate-900">{r.within ? t('twin.within') : t('twin.different')}</p>}
            {sharing && <Trend t={t} row={r} history={history} baseline={baseline} />}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <section aria-label={t('twin.title')} className="mt-4 rounded-xl border border-slate-200 p-4">
      <h2 className="mb-2 text-lg font-bold">{t('twin.title')}</h2>
      {body}
      {sharingOff && (
        <div role="status" className="mt-2 text-sm font-semibold text-slate-900">
          <p>{t('twin.sharingOff')}</p>
          <Link to="/consent" className="inline-flex min-h-[44px] items-center text-blue-800 underline">{t('twin.sharingOffLink')}</Link>
        </div>
      )}
      {sharing && <p className="mt-2 text-xs text-slate-700">{t('twin.simulated')}</p>}
      <p className="mt-2 text-sm text-slate-700">{t('twin.notDiagnosis')}</p>
    </section>
  );
}
