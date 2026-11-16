// "Showing: <city>" on every scoped page, and the switcher in the header (admin only; staff see their own city).
import { useT } from '../i18n/index.js';
import { useCity } from './CityProvider.jsx';
import { ALL_CITIES } from '../services/cityScope.js';

export function CityLabel({ className = '' }) {
  const t = useT();
  const { showing, isAll } = useCity();
  return <p data-testid="city-showing" className={'text-sm font-semibold text-slate-700 ' + className}>{t('city.showing', { name: isAll ? t('city.all') : (showing || '') })}</p>;
}

export function CitySwitcher() {
  const t = useT();
  const { cities, cityId, setCityId, canSwitch, showing } = useCity();
  if (!cities.length) return null;
  if (!canSwitch) return <span data-testid="city-fixed" className="text-sm text-slate-300">{t('city.yours', { name: showing || '' })}</span>;
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      {t('city.label')}
      <select data-testid="city-switcher" value={cityId || ''} onChange={(e) => setCityId(e.target.value)} className="rounded bg-slate-800 px-2 py-1 text-white">
        {cities.map((c) => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
        <option value={ALL_CITIES}>{t('city.all')}</option>
      </select>
    </label>
  );
}
