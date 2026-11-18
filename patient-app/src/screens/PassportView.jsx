// The page a responder sees after scanning the QR. Public (no login), read-only, big text, three languages.
// It shows only what the patient allowed. It states facts entered by the patient and never interprets them.
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicPassport } from '../services/api';
import CallButton from '../components/CallButton';
import LanguageSelect from '../components/LanguageSelect';
import ErrorMessage from '../components/ErrorMessage';
import { Skeleton } from '../components/ui/Feedback';
import PassportQuickView from '../components/PassportQuickView';
import { LogoMark } from '../components/icons';

export default function PassportView() {
  const { t } = useTranslation();
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading', data: null }); // loading | ok | gone | error

  const load = useCallback(() => {
    setState({ status: 'loading', data: null });
    getPublicPassport(token)
      .then((data) => setState({ status: 'ok', data }))
      .catch((err) => setState({ status: err.status === 410 || err.status === 404 ? 'gone' : 'error', data: null }));
  }, [token]);
  useEffect(() => {
    load();
    const meta = document.createElement('meta'); // keep passport pages out of search engines
    meta.name = 'robots'; meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [load]);

  const { status, data } = state;
  return (
    <div className="text-lg">
      <div role="note" className="-mx-1 mb-2 rounded-xl bg-amber-100 px-3 py-2 text-base font-bold text-amber-950">{t('view.banner')}</div>
      <CallButton />
      <h1 className="mb-3 mt-4 flex items-center gap-2 text-2xl font-bold text-slate-900"><LogoMark size={28} />{t('view.title')}</h1>
      <LanguageSelect saveToRecord={false} />
      {status === 'loading' && <div role="status" aria-label={t('view.loading')} className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-24" /></div>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('view.error')}</ErrorMessage>}
      {status === 'gone' && (
        <div role="alert" className="rounded-card border-2 border-slate-300 bg-white shadow-card p-4">
          <p className="text-xl font-bold">{t('view.gone')}</p>
          <p>{t('view.goneHelp')}</p>
        </div>
      )}
      {status === 'ok' && (
        <PassportQuickView data={data}>
          <a href={'/portal/passport?t=' + encodeURIComponent(token)} className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border-2 border-brand-800 px-4 font-semibold text-brand-800">{t('view.staffSignIn')}</a>
        </PassportQuickView>
      )}
    </div>
  );
}
