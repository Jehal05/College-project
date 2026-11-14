// Checklist of symptoms for one emergency category. A ticked row also gets a border and a tick, so it never depends on colour alone.
import { useTranslation } from 'react-i18next';

export default function SymptomGroup({ symptoms, selected, onToggle }) {
  const { t } = useTranslation();
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-lg font-bold">{t('symptoms.tickSymptoms')}</legend>
      <ul>
        {symptoms.map((id) => {
          const on = selected.includes(id);
          return (
            <li key={id} className="mb-2">
              <label className={'flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 text-base shadow-card ' +
                (on ? 'border-brand-700 bg-brand-50 font-semibold text-brand-900' : 'border-slate-200 bg-white text-slate-900')}>
                <input type="checkbox" className="h-6 w-6 shrink-0 accent-brand-700" checked={on} onChange={() => onToggle(id)} />
                <span className="min-w-0 break-words">{t('symptom.' + id)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
