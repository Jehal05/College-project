// Checklist of symptoms for one emergency category.
import { useTranslation } from 'react-i18next';

export default function SymptomGroup({ symptoms, selected, onToggle }) {
  const { t } = useTranslation();
  return (
    <fieldset className="mt-4">
      <legend className="mb-2 text-lg font-bold">{t('symptoms.tickSymptoms')}</legend>
      <ul>
        {symptoms.map((id) => (
          <li key={id} className="mb-2">
            <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3 text-base">
              <input type="checkbox" className="h-6 w-6" checked={selected.includes(id)} onChange={() => onToggle(id)} />
              <span>{t('symptom.' + id)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
