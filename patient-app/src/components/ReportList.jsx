// The list of uploaded reports with a share indicator that follows the Reports consent switch.
import { useTranslation } from 'react-i18next';

const small = 'min-h-[44px] rounded-lg bg-slate-200 px-3 font-semibold';
const formatSize = (bytes) => (bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB');
const typeName = (type) => (type === 'application/pdf' ? 'PDF' : type === 'image/png' ? 'PNG' : 'JPG');

// shareOn: true / false, or null while the consent is still loading (then no indicator is shown).
export default function ReportList({ reports, shareOn, onOpen, onDelete }) {
  const { t } = useTranslation();
  if (reports.length === 0) return <p className="text-slate-700">{t('reports.empty')}</p>;
  return (
    <ul>
      {reports.map((r) => (
        <li key={r.id} className="mb-3 rounded-xl border border-slate-200 p-3">
          <p className="break-words text-lg font-bold">{r.name}</p>
          <p className="text-sm text-slate-700">{typeName(r.content_type)} · {formatSize(r.size)} · {new Date(r.uploaded_at).toLocaleDateString()}</p>
          {shareOn !== null && (
            <p className={'mt-1 text-sm font-semibold ' + (shareOn ? 'text-green-800' : 'text-slate-700')}>
              {shareOn ? t('reports.shared') : t('reports.notShared')}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button type="button" className={small} onClick={() => onOpen(r)} aria-label={t('reports.openFor', { name: r.name })}>{t('reports.open')}</button>
            <button type="button" className={small} onClick={() => onDelete(r)} aria-label={t('reports.deleteFor', { name: r.name })}>{t('common.delete')}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
