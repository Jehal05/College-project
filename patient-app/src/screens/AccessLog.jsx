// "Who saw my data": every time someone other than the patient looked at their information.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BackLink from '../components/BackLink';
import Card from '../components/ui/Card';
import { Skeleton, EmptyState } from '../components/ui/Feedback';
import ErrorMessage from '../components/ErrorMessage';
import useAuth from '../hooks/useAuth';
import useAccessLog from '../hooks/useAccessLog';
import { describeEntry } from '../utils/accessLog';
import { formatDateTime } from '../utils/time';

export default function AccessLog() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { entries, more, status, justNow, load, loadMore } = useAccessLog(session.patient_id);

  return (
    <div>
      <BackLink />
      <h1 className="mb-1 text-2xl font-bold text-slate-900">{t('access.title')}</h1>
      <p className="mb-2 text-slate-700">{t('access.intro')}</p>
      <p className="mb-4 text-sm text-slate-600">{t('access.simulated')}</p>
      <Link to="/consent" className="mb-4 inline-block font-semibold text-blue-800 underline">{t('access.change')}</Link>
      <div role="status" aria-live="polite" className="min-h-[24px] font-semibold text-blue-900">{justNow ? t('access.live') : ''}</div>

      {status === 'loading' && <div role="status" aria-label={t('access.loading')} className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('access.loadError')}</ErrorMessage>}
      {status === 'ready' && (entries.length === 0 ? <EmptyState icon="shield" title={t('access.empty')} /> : (
        <>
          <Card as="ul" className="divide-y divide-slate-100 !p-0">
            {entries.map((e) => {
              const d = describeEntry(t, e);
              return (
                <li key={e.id} className="p-3 text-sm">
                  <p className="font-semibold">{d.who} {d.what}</p>
                  <p className={d.blocked ? 'text-red-800' : 'text-slate-700'}>{d.result}</p>
                  <time dateTime={e.at} className="text-slate-600">{formatDateTime(e.at)}</time>
                </li>
              );
            })}
          </Card>
          {more && <button type="button" onClick={loadMore} className="mt-3 min-h-[44px] rounded-lg border border-slate-300 px-4 font-semibold">{t('access.more')}</button>}
        </>
      ))}
    </div>
  );
}
