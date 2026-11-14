// The list of uploaded reports with a share indicator that follows the Reports consent switch.
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '../utils/time';
import Icon from './icons';
import Button from './ui/Button';
import { Chip, EmptyState } from './ui/Feedback';

const formatSize = (bytes) => (bytes < 1024 * 1024 ? formatNumber(Math.max(1, Math.round(bytes / 1024))) + ' KB' : formatNumber(bytes / 1024 / 1024, { maximumFractionDigits: 1 }) + ' MB');
const typeName = (type) => (type === 'application/pdf' ? 'PDF' : type === 'image/png' ? 'PNG' : 'JPG');

// shareOn: true / false, or null while the consent is still loading (then no indicator is shown).
export default function ReportList({ reports, shareOn, onOpen, onDelete, disabled = false }) {
  const { t } = useTranslation();
  if (reports.length === 0) return <EmptyState icon="file" title={t('reports.empty')} />;
  return (
    <ul>
      {reports.map((r) => (
        <li key={r.id} className="mb-3 rounded-card border border-slate-200 bg-white p-3 shadow-card">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name="file" /></span>
            <div className="min-w-0 flex-1">
              <p className="break-words font-bold text-slate-900">{r.name}</p>
              <p className="text-sm text-slate-600">{typeName(r.content_type)} · {formatSize(r.size)} · {formatDate(r.uploaded_at)}</p>
              {shareOn !== null && (
                <Chip className="mt-1" tone={shareOn ? 'success' : 'neutral'} icon={shareOn ? 'check' : 'lock'}>
                  {shareOn ? t('reports.shared') : t('reports.notShared')}
                </Chip>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={disabled} onClick={() => onOpen(r)} aria-label={t('reports.openFor', { name: r.name })}>{t('reports.open')}</Button>
            <Button variant="secondary" disabled={disabled} onClick={() => onDelete(r)} aria-label={t('reports.deleteFor', { name: r.name })}>{t('common.delete')}</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
