// Choose a report file, check type and size BEFORE uploading, and show a busy state while it uploads.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateReportFile } from '../utils/validate';
import ErrorMessage from './ErrorMessage';

export default function ReportUpload({ onUpload, disabled = false }) {
  const { t } = useTranslation();
  const id = useId();
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function choose(event) {
    const input = event.target;
    const file = input.files[0];
    if (!file) return;
    const problem = validateReportFile(file);
    setError(problem ? t(problem) : '');
    if (!problem) {
      setUploading(true);
      try { await onUpload(file); } catch (err) { setError(err.status === 409 ? t('reports.limit') : t('reports.uploadError')); }
      setUploading(false);
    }
    input.value = ''; // so the same file can be chosen again
  }

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">{t('reports.choose')}</label>
      <input id={id} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={choose}
        disabled={uploading || disabled} className="mt-1 block min-h-[44px] w-full text-base" />
      <p className="mt-1 text-sm text-slate-600">{t('reports.rules')}</p>
      {uploading && <p role="status" className="mt-2 font-semibold">{t('reports.uploading')}</p>}
      {error && <div className="mt-2"><ErrorMessage>{error}</ErrorMessage></div>}
    </div>
  );
}
