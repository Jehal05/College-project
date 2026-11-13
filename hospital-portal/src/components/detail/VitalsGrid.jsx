import { NOT_SHARED } from '../../services/adapters.js';

/** Heart rate, SpO2 and blood pressure. No vitals at all reads "Not shared". */
export default function VitalsGrid({ emergency: e }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold">Vitals</h3>
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Heart rate', e.vitals?.heart_rate, 'bpm'],
          ['SpO₂', e.vitals?.spo2, '%'],
          ['Blood pressure', e.vitals?.bp, ''],
        ].map(([label, value, unit]) => (
          <div key={label} className="rounded-xl bg-slate-100 p-3">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-2xl font-bold">{value ?? (e.vitals ? '–' : NOT_SHARED)} {value != null && <span className="text-base font-normal">{unit}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
