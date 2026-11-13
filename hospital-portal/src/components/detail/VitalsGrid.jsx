import { useT } from '../../i18n/index.js';

/** Heart rate, SpO2 and blood pressure. No vitals at all reads "Not shared". */
export default function VitalsGrid({ emergency: e }) {
  const t = useT();
  return (
    <div>
      <h3 className="mb-2 font-semibold">{t('sec.vitals')}</h3>
      <div className="grid grid-cols-3 gap-3">
        {[
          [t('vitals.heartRate'), e.vitals?.heart_rate, 'bpm'],
          ['SpO₂', e.vitals?.spo2, '%'],
          [t('vitals.bp'), e.vitals?.bp, ''],
        ].map(([label, value, unit]) => (
          <div key={label} className="rounded-xl bg-slate-100 p-3">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-2xl font-bold">{value ?? (e.vitals ? '–' : t('common.notShared'))} {value != null && <span className="text-base font-normal">{unit}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
