// Reports: upload fake demo files, see which will be shared (follows the Reports consent), open and delete.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useReports from '../hooks/useReports';
import useConsents from '../hooks/useConsents';
import { getReportFileUrl } from '../services/api';
import ReportUpload from '../components/ReportUpload';
import ReportList from '../components/ReportList';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';

export default function Reports() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { reports, status, load, upload, remove } = useReports(session.patient_id);
  const { consents } = useConsents(session.patient_id);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  // Open the file in a new tab. The tab is opened first (a click is required), then pointed at the file.
  async function open(report) {
    setProblem('');
    const tab = window.open('about:blank', '_blank');
    try {
      const url = await getReportFileUrl(session.patient_id, report.id);
      if (tab) tab.location.href = url; else window.location.href = url;
    } catch {
      if (tab) tab.close();
      setProblem(t('reports.openError'));
    }
  }
  async function confirmDelete() {
    setBusy(true);
    try { await remove(deleting.id); setDeleting(null); } catch { setProblem(t('reports.deleteError')); }
    setBusy(false);
  }

  return (
    <div>
      <Link to="/profile" className="mb-2 inline-flex min-h-[44px] items-center font-semibold text-blue-700 underline">{t('common.back')}</Link>
      <h1 className="mb-2 text-2xl font-bold">{t('reports.title')}</h1>
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">{t('reports.demoOnly')}</p>
      <ReportUpload onUpload={upload} />
      {problem && <div className="mb-3"><ErrorMessage>{problem}</ErrorMessage></div>}
      {status === 'loading' && <p role="status">{t('reports.loading')}</p>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('reports.loadError')}</ErrorMessage>}
      {status === 'ready' && (
        <>
          <h2 className="mb-2 text-lg font-bold">{t('reports.yours')}</h2>
          {deleting && <ConfirmDialog title={t('reports.confirmDelete', { name: deleting.name })} confirmLabel={t('reports.confirmYes')}
            onConfirm={confirmDelete} onCancel={() => setDeleting(null)} busy={busy} />}
          <ReportList reports={reports} shareOn={consents ? consents.reports : null} onOpen={open} onDelete={(r) => { setProblem(''); setDeleting(r); }} />
        </>
      )}
    </div>
  );
}
