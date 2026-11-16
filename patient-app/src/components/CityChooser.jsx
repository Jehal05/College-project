// "My city" chooser: one radio per city from GET /cities. Choosing one changes the map, the hospital list and the simulated
// start point everywhere, and is saved as the patient's home city. Works with the keyboard (arrow keys) and a screen reader.
import { useTranslation } from 'react-i18next';
import useCity from '../hooks/useCity';
import { InlineNotice } from './ui/Feedback';

export default function CityChooser({ themed = false, className = '' }) {
  const { t } = useTranslation();
  const { cities, city, status, saveFailed, select } = useCity();
  const text = themed ? 'text-ht-text' : 'text-slate-900';
  if (status === 'error') return <p role="alert" className={'text-sm ' + text}>{t('city.loadError')}</p>;
  if (!cities.length) return <p role="status" className="text-sm text-slate-600">{t('city.loading')}</p>;
  return (
    <fieldset className={'min-w-0 ' + className}>
      <legend className={'mb-1 text-sm font-semibold ' + text}>{t('city.label')}</legend>
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => {
          const on = city && city.city_id === c.city_id;
          return (
            <label key={c.city_id} className="relative">
              <input type="radio" name="city" value={c.city_id} checked={!!on} onChange={() => select(c.city_id)} className="peer sr-only" />
              <span className={'flex min-h-[44px] cursor-pointer items-center rounded-xl border-2 px-4 font-semibold peer-focus-visible:outline peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-700 '
                + (on ? 'border-brand-700 bg-brand-700 text-white' : (themed ? 'border-ht-line bg-ht-card text-ht-text' : 'border-slate-300 bg-white text-slate-900'))}>
                <span data-source="data">{c.city_name}</span><span data-source="data" className="ml-2 text-sm font-normal opacity-80">{c.state}</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className={'mt-1 text-sm ' + (themed ? 'text-ht-muted' : 'text-slate-600')}>{t('city.help')}</p>
      {saveFailed && <InlineNotice tone="warning">{t('city.saveFailed')}</InlineNotice>}
    </fieldset>
  );
}
