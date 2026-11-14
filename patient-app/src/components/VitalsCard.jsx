// Live card: heart rate and SpO2 as plain numbers, with a connection chip. Simulated data.
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import { Chip } from './ui/Feedback';
import Icon from './icons';

// One number tile (kept outside the card so React does not rebuild it every second).
function Item({ icon, label, value, unit }) {
  return (
    <div className="min-w-[7rem] flex-1 rounded-xl bg-slate-50 p-3">
      <p className="flex items-center gap-1 text-sm font-medium text-slate-700"><Icon name={icon} size={16} className="text-brand-700" />{label}</p>
      <p className="num mt-1 text-3xl font-extrabold text-slate-900">{value ?? '--'}<span className="ml-1 text-base font-medium text-slate-600">{unit}</span></p>
    </div>
  );
}

export default function VitalsCard({ vitals, connected }) {
  const { t } = useTranslation();
  return (
    <Card aria-label={t('home.status')}>
      <p role="status" className="mb-3">
        <Chip tone={connected ? 'success' : 'neutral'} icon={connected ? 'activity' : 'clock'}>{connected ? t('home.status') : t('home.statusOffline')}</Chip>
      </p>
      <div className="flex flex-wrap gap-3">
        <Item icon="heart" label={t('home.heartRate')} value={vitals?.heart_rate} unit="BPM" />
        <Item icon="drop" label={t('home.spo2')} value={vitals?.spo2} unit="%" />
      </div>
      {!vitals && <p className="mt-3 text-sm text-slate-600">{t('home.waiting')}</p>}
    </Card>
  );
}
