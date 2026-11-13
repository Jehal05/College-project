// Shows what has happened after the SOS: location source, hospital, ambulance ETA, status and timeline.
import { useTranslation } from 'react-i18next';
import StatusBar from './StatusBar';
import Timeline from './Timeline';
import Icon from './icons';

const ETA_STATES = ['AMBULANCE_DISPATCHED', 'EN_ROUTE'];

export default function ResponseCard({ emergency, events }) {
  const { t } = useTranslation();
  const { location, hospital, state, eta_seconds: eta } = emergency;
  // Location label comes from what the server stored, so it is right after a reload too.
  const locationLabel = !location ? t('emergency.locationOff')
    : location.source === 'gps' ? t('emergency.locationReal') : t('emergency.locationDemo');
  return (
    <section aria-label={t('emergency.sent')} className="mt-4 rounded-card bg-white p-4 text-slate-900 shadow-lift">
      <h2 className="mb-1 flex items-center gap-2 text-xl font-bold"><Icon name="send" className="text-brand-700" />{t('emergency.sent')}</h2>
      <p className="flex items-center gap-1 text-sm text-slate-700"><Icon name="pin" size={16} />{locationLabel}</p>
      {hospital && (
        <p className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 font-semibold">
          <Icon name="hospital" className="text-brand-700" size={26} /><span className="min-w-0 break-words">{t('emergency.hospital')}: {hospital.name}</span>
        </p>
      )}
      {typeof eta === 'number' && ETA_STATES.includes(state) && (
        <p className="num mt-2 flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-lg font-bold text-brand-900">
          <Icon name="ambulance" size={26} />{t('emergency.eta', { minutes: Math.floor(eta / 60), seconds: eta % 60 })}
        </p>
      )}
      <div className="mt-3"><StatusBar state={state} /></div>
      <h3 className="mb-3 mt-5 font-bold">{t('timeline.title')}</h3>
      <Timeline events={events} />
    </section>
  );
}
