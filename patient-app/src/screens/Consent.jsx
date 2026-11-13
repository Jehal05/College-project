// Consent screen: four sharing switches that save immediately, plus a list of recent changes.
import { Link } from 'react-router-dom';
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
      <Link to="/profile" className="mb-2 inline-flex min-h-[44px] items-center font-semibold text-blue-700 underline">{t('common.back')}</Link>
      <h1 className="mb-1 text-2xl font-bold">{t('consent.title')}</h1>
      <p className="mb-4 text-slate-700">{t('consent.intro')}</p>
      <OfflineNote />

      {status === 'loading' && <p role="status">{t('consent.loading')}</p>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('consent.loadError')}</ErrorMessage>}
      {status === 'ready' && (
        <>
          <ConsentToggles consents={consents} onToggle={toggle} disabled={!online} />
          <div role="status" aria-live="polite" className="mb-3 min-h-[24px] font-semibold">
            {saveState === 'saving' && t('common.saving')}
            {saveState === 'saved' && <span className="text-green-800">{t('common.saved')}</span>}
          </div>
          {saveState === 'failed' && <div className="mb-3"><ErrorMessage onRetry={retry} retryLabel={t('common.retry')}>{t('consent.saveError')}</ErrorMessage></div>}

          <h2 className="mb-2 text-lg font-bold">{t('consent.recent')}</h2>
          {changes.length === 0 ? <p className="text-slate-700">{t('consent.noChanges')}</p> : (
            <ul>
              {changes.map((c, i) => (
                <li key={i} className="mb-1 text-sm">
                  <span className="font-semibold">{t('consent.' + c.key + '.title')}: {c.value ? t('consent.on') : t('consent.off')}</span>
                  {' · '}<time dateTime={c.timestamp}>{formatDateTime(c.timestamp)}</time>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
