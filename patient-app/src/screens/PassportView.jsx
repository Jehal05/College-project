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
      <h1 className="mb-3 mt-4 text-2xl font-bold">{t('view.title')}</h1>
      <LanguageSelect saveToRecord={false} />
      {status === 'loading' && <p role="status">{t('view.loading')}</p>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('view.error')}</ErrorMessage>}
      {status === 'gone' && (
        <div role="alert" className="rounded-xl border-2 border-slate-400 bg-slate-50 p-4">
          <p className="text-xl font-bold">{t('view.gone')}</p>
          <p>{t('view.goneHelp')}</p>
        </div>
      )}
      {status === 'ok' && (
        <div data-testid="passport-content">
          <p className="mb-3 font-semibold text-slate-800">{t('view.preparedBy')}</p>
          <section aria-label={t('view.patient')} className="mb-4 rounded-xl border border-slate-300 p-4">
            <h2 className="text-2xl font-bold">{data.name}</h2>
            <p>{t('view.age', { age: data.age })}</p>
            <p>{t('view.bloodGroup')}: <strong>{data.blood_group || t('view.none')}</strong></p>
          </section>
          <PassportSection title={t('view.allergies')} items={data.allergies} shared={data.shared.history} />
          <PassportSection title={t('view.conditions')} items={data.conditions} shared={data.shared.history} />
          <PassportSection title={t('view.medicines')} items={data.medications} shared={data.shared.history} />
          <PassportSection title={t('view.contacts')} shared={data.shared.history}
            items={(data.contacts || []).map((c) => (
              <span key={c.phone}>{c.name} ({t('relation.' + c.relation, { defaultValue: c.relation })}) <a href={'tel:' + c.phone.replace(/[\s-]/g, '')} className="inline-flex min-h-[44px] items-center font-semibold underline">{c.phone}</a></span>
            ))} />
          <p className="text-sm text-slate-700">{t('view.expires', { time: formatDateTime(data.expires_at) })}</p>
        </div>
      )}
    </div>
  );
}
