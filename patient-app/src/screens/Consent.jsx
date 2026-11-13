// Consent screen: four sharing switches that save immediately, plus a list of recent changes.
import BackLink from '../components/BackLink';
import { Skeleton, EmptyState } from '../components/ui/Feedback';
import Card from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useConsents from '../hooks/useConsents';
import ConsentToggles from '../components/ConsentToggles';
import ErrorMessage from '../components/ErrorMessage';
import OfflineNote from '../components/OfflineNote';
import useOnline from '../hooks/useOnline';
import { formatDateTime } from '../utils/time';

export default function Consent() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { consents, changes, status, saveState, load, toggle, retry } = useConsents(session.patient_id);
  const online = useOnline();

  return (
    <div>
      <BackLink />
      <h1 className="mb-1 text-2xl font-bold text-slate-900">{t('consent.title')}</h1>
      <p className="mb-4 text-slate-700">{t('consent.intro')}</p>
      <OfflineNote />

      {status === 'loading' && <div role="status" aria-label={t('consent.loading')} className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('consent.loadError')}</ErrorMessage>}
      {status === 'ready' && (
        <>
          <ConsentToggles consents={consents} onToggle={toggle} disabled={!online} />
          <div role="status" aria-live="polite" className="mb-3 min-h-[24px] font-semibold">
            {saveState === 'saving' && t('common.saving')}
            {saveState === 'saved' && <span className="text-green-800">{t('common.saved')}</span>}
          </div>
          {saveState === 'failed' && <div className="mb-3"><ErrorMessage onRetry={retry} retryLabel={t('common.retry')}>{t('consent.saveError')}</ErrorMessage></div>}

          <h2 className="mb-2 mt-6 text-lg font-bold">{t('consent.recent')}</h2>
          {changes.length === 0 ? <EmptyState icon="shield" title={t('consent.noChanges')} /> : (
            <Card as="ul" className="divide-y divide-slate-100 !p-0">
              {changes.map((c, i) => (
                <li key={i} className="p-3 text-sm">
                  <span className="font-semibold">{t('consent.' + c.key + '.title')}: {c.value ? t('consent.on') : t('consent.off')}</span>
                  {' · '}<time dateTime={c.timestamp}>{formatDateTime(c.timestamp)}</time>
                </li>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
