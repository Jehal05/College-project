// The lab values a person confirmed, with the range they typed from their report. Never calls a value "normal" on its own.
import { useTranslation } from 'react-i18next';
import StatusChip from '../ui/StatusChip';
import { rangeStatus } from '../../utils/labs';

const TONE = { within: 'ok', outside: 'caution', norange: 'neutral' };

export default function LabValueList({ entries, onRemove }) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-3">
      {entries.map((e) => {
        const st = rangeStatus(e);
        return (
          <li key={e.id} className="rounded-xl border border-ht-line bg-ht-bg p-3 text-sm">
            <p className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{t('lab.' + e.lab)}</span>
              <span className="num text-lg font-extrabold">{e.value} <span className="text-sm font-semibold text-ht-muted">{e.unit}</span></span>
            </p>
            <p className="text-ht-muted">{t('ri.measured', { date: e.date })}{e.low !== null || e.high !== null ? ' · ' + t('ri.printed', { low: e.low ?? '–', high: e.high ?? '–' }) : ''}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusChip tone={TONE[st]}>{t('ri.status.' + st)}</StatusChip>
              <StatusChip tone="neutral" icon="info">{t('ri.notReviewed')}</StatusChip>
              {onRemove && <button type="button" onClick={() => onRemove(e.id)} aria-label={t('ri.removeFor', { name: t('lab.' + e.lab) })} className="min-h-[44px] rounded-xl border border-ht-line px-3 text-sm font-semibold hover:border-ht-accent">{t('common.delete')}</button>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
