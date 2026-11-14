// List of emergency stages with times. events = [{ state, timestamp }]. Reused by Puneet's portal too.
// Each stage has an icon marker; the latest stage is filled. The text carries the meaning, the icon only helps the eye.
import { useTranslation } from 'react-i18next';
import { formatTime } from '../utils/time';
import Icon from './icons';

const ICON = { SOS_SENT: 'send', HOSPITAL_ACKNOWLEDGED: 'hospital', AMBULANCE_DISPATCHED: 'ambulance', EN_ROUTE: 'ambulance', ARRIVED: 'pin', HANDOVER_DONE: 'check', CANCELLED: 'alert' };

export default function Timeline({ events = [] }) {
  const { t } = useTranslation();
  if (events.length === 0) return <p className="text-sm text-slate-600">{t('timeline.empty')}</p>;
  return (
    <ol aria-label={t('timeline.title')} className="ml-4 border-l-2 border-slate-300 pl-6">
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <li key={i} className="relative mb-4 last:mb-0">
            <span aria-hidden="true" className={'absolute -left-[2.15rem] flex h-7 w-7 items-center justify-center rounded-full border-2 ' + (last ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-600')}>
              <Icon name={ICON[e.state] || 'clock'} size={14} />
            </span>
            <p className="font-semibold text-slate-900">{t('state.' + e.state)}</p>
            <time dateTime={e.timestamp} className="num text-sm text-slate-600">{formatTime(e.timestamp)}</time>
          </li>
        );
      })}
    </ol>
  );
}
