// List of emergency stages with times. events = [{ state, timestamp }]. Reused by Puneet's portal too.
import { useTranslation } from 'react-i18next';
import { formatTime } from '../utils/time';

export default function Timeline({ events = [] }) {
  const { t } = useTranslation();
  if (events.length === 0) return <p className="text-sm text-slate-600">{t('timeline.empty')}</p>;
  return (
    <ol aria-label={t('timeline.title')} className="border-l-2 border-slate-300 pl-4">
      {events.map((e, i) => (
        <li key={i} className="mb-3">
          <p className="font-semibold text-slate-900">{t('state.' + e.state)}</p>
          <time dateTime={e.timestamp} className="text-sm text-slate-600">{formatTime(e.timestamp)}</time>
        </li>
      ))}
    </ol>
  );
}
