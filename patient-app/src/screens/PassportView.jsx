// The page a responder sees after scanning the QR. Public (no login), read-only, big text, three languages.
// It shows only what the patient allowed. It states facts entered by the patient and never interprets them.
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicPassport } from '../services/api';
import { formatDateTime } from '../utils/time';
import CallButton from '../components/CallButton';
import LanguageSelect from '../components/LanguageSelect';
import PassportSection from '../components/PassportSection';
import ErrorMessage from '../components/ErrorMessage';
import { Avatar } from '../components/ui/Card';
import { InlineNotice, Skeleton } from '../components/ui/Feedback';
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
        <div data-testid="passport-content">
          <InlineNotice tone="warning" className="mb-3 !text-base font-semibold">{t('view.preparedBy')}</InlineNotice>
          <section aria-label={t('view.patient')} className="mb-4 rounded-card border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <Avatar name={data.name} size={56} />
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-bold text-slate-900">{data.name}</h2>
                <p className="text-slate-700">{t('view.age', { age: data.age })}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">{t('view.bloodGroup')}: <strong className="text-2xl text-slate-900">{data.blood_group || t('view.none')}</strong></p>
          </section>
          <PassportSection title={t('view.allergies')} items={data.allergies} shared={data.shared.history} />
          <PassportSection title={t('view.conditions')} items={data.conditions} shared={data.shared.history} />
          <PassportSection title={t('view.medicines')} items={data.medications} shared={data.shared.history} />
          <PassportSection title={t('view.contacts')} shared={data.shared.history}
            items={(data.contacts || []).map((c) => (
              <span key={c.phone}>{c.name} ({t('relation.' + c.relation, { defaultValue: c.relation })}) <a href={'tel:' + c.phone.replace(/[\s-]/g, '')} className="inline-flex min-h-[44px] items-center font-semibold text-brand-800 underline">{c.phone}</a></span>
            ))} />
          <p className="text-sm text-slate-700">{t('view.expires', { time: formatDateTime(data.expires_at) })}</p>
        </div>
      )}
    </div>
  );
}
