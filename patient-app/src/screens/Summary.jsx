// Post-incident summary: a record of what the app did, to share with the person's own doctor. Not medical advice.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useSummary from '../hooks/useSummary';
import { summaryText } from '../utils/summaryText';
import SummaryView from '../components/SummaryView';
import ShareActions from '../components/ShareActions';
import WhyThisAlert from '../components/WhyThisAlert';
import ErrorMessage from '../components/ErrorMessage';

export default function Summary() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { summary, status, load } = useSummary(session.patient_id, id);
  const [notes, setNotes] = useState(''); // stays on this screen (memory only) and is added to the shared text

  return (
    <div>
      <Link to="/profile" className="mb-2 inline-flex min-h-[44px] items-center font-semibold text-blue-700 underline print:hidden">{t('common.back')}</Link>
      <h1 className="mb-2 text-2xl font-bold">{t('summary.title')}</h1>
      {status === 'loading' && <p role="status">{t('summary.loading')}</p>}
      {status === 'notFound' && <p role="status">{t('summary.notFound')}</p>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('summary.error')}</ErrorMessage>}
      {summary && (
        <>
          <section className="print-area" aria-label={t('summary.title')}>
            <SummaryView summary={summary} />
            {notes.trim() && <><h2 className="mt-4 text-base font-bold">{t('summary.notesTitle')}</h2><p className="whitespace-pre-wrap">{notes}</p></>}
            <p className="mt-4 text-sm text-slate-700">{t('summary.footer')}</p>
          </section>
          <label className="mt-4 block font-semibold print:hidden">
            {t('summary.notesTitle')}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={1000} placeholder={t('summary.notesPlaceholder')}
              className="mt-1 block w-full rounded-lg border-2 border-slate-400 p-2 font-normal" />
          </label>
          <ShareActions text={summaryText(summary, t, notes)} fileName={'healthtwin-alert-' + summary.id + '.txt'} />
          <div className="print:hidden"><WhyThisAlert emergencyId={summary.id} source={summary.source} /></div>
        </>
      )}
    </div>
  );
}
