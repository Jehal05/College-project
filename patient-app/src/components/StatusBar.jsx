// Shows where an emergency is in the shared state order. Reused in later phases.
import { useTranslation } from 'react-i18next';

export const STATES = ['MONITORING', 'SYMPTOMS_REPORTED', 'EMERGENCY_DETECTED', 'SOS_SENT',
  'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE'];

export default function StatusBar({ state = 'MONITORING' }) {
  const { t } = useTranslation();
  const current = STATES.indexOf(state); // -1 for CANCELLED / ESCALATED
  return (
    <ol aria-label={t('home.state')} className="flex flex-wrap gap-2">
      {STATES.map((s, i) => {
        const active = i === current;
        const done = current >= 0 && i < current;
        const style = active ? 'bg-blue-700 text-white' : done ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700';
        return (
          <li key={s} aria-current={active ? 'step' : undefined} className={'rounded-full px-3 py-1 text-xs font-semibold ' + style}>
            {t('state.' + s)}
          </li>
        );
      })}
      {current < 0 && <li className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold">{t('state.' + state)}</li>}
    </ol>
  );
}
