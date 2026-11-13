// Small live card: heart rate and SpO2 as plain numbers (no chart yet).
import { useTranslation } from 'react-i18next';

// One number tile (kept outside the card so React does not rebuild it every second).
function Item({ label, value, unit }) {
  return (
    <div className="min-w-[7rem] flex-1 rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{value ?? '--'}<span className="ml-1 text-base font-normal">{unit}</span></p>
    </div>
  );
}

export default function VitalsCard({ vitals, connected }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('home.status')} className="rounded-xl border border-slate-200 p-4">
      <p role="status" className={'mb-3 text-sm font-semibold ' + (connected ? 'text-green-700' : 'text-slate-600')}>
        {connected ? t('home.status') : t('home.statusOffline')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Item label={t('home.heartRate')} value={vitals?.heart_rate} unit="BPM" />
        <Item label={t('home.spo2')} value={vitals?.spo2} unit="%" />
      </div>
      {!vitals && <p className="mt-3 text-sm text-slate-600">{t('home.waiting')}</p>}
    </section>
  );
}
