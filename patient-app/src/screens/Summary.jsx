// Post-incident summary: a record of what the app did, to share with the person's own doctor. Not medical advice.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useSummary from '../hooks/useSummary';
import { summaryText } from '../utils/summaryText';
import SummaryView from '../components/SummaryView';
import ShareActions from '../components/ShareActions';
import WhyThisAlert from '../components/WhyThisAlert';
import ErrorMessage from '../components/ErrorMessage';
import BackLink from '../components/BackLink';
import Card from '../components/ui/Card';
import { EmptyState, Skeleton } from '../components/ui/Feedback';

export default function Summary() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { summary, status, load } = useSummary(session.patient_id, id);
  const [notes, setNotes] = useState(''); // stays on this screen (memory only) and is added to the shared text

  return (
    <div>
      <div className="print:hidden"><BackLink /></div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('summary.title')}</h1>
      {status === 'loading' && <div role="status" aria-label={t('summary.loading')} className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>}
      {status === 'notFound' && <div role="status"><EmptyState icon="file" title={t('summary.notFound')} /></div>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('summary.error')}</ErrorMessage>}
      {summary && (
        <>
          <Card className="print-area" aria-label={t('summary.title')}>
            <SummaryView summary={summary} />
            {notes.trim() && <><h2 className="mt-4 text-base font-bold">{t('summary.notesTitle')}</h2><p className="whitespace-pre-wrap">{notes}</p></>}
            <p className="mt-4 text-sm text-slate-700">{t('summary.footer')}</p>
          </Card>
          <label className="mt-4 block font-semibold print:hidden">
            {t('summary.notesTitle')}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={1000} placeholder={t('summary.notesPlaceholder')}
              className="mt-1 block w-full rounded-xl border-2 border-slate-300 bg-white p-2 font-normal" />
          </label>
          <ShareActions text={summaryText(summary, t, notes)} fileName={'healthtwin-alert-' + summary.id + '.txt'} />
          <div className="print:hidden"><WhyThisAlert emergencyId={summary.id} source={summary.source} /></div>
        </>
      )}
    </div>
  );
}
