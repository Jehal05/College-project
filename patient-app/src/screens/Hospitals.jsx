// Hospitals of the person's current city (simulated). The list and the map come from GET /hospitals?city_id= and
// GET /cities: no coordinates are written in this file. Every hospital here is invented; nothing is a real service.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useCity from '../hooks/useCity';
import { getHospitals } from '../services/api';
import { filterByCity, startPoint } from '../utils/cities';
import CityChooser from '../components/CityChooser';
import CityMap from '../components/themed/CityMap';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import Icon from '../components/icons';

const CAPS = ['emergency', 'icu', 'cath_lab', 'stroke_unit'];

export default function Hospitals() {
  const { t } = useTranslation();
  const { city, status } = useCity();
  const [list, setList] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);
  const start = useMemo(() => startPoint(city), [city]);
  const cityId = city && city.city_id;

  const load = useCallback(() => {
    if (!cityId) return;
    setList(null); setFailed(false);
    getHospitals({ cityId, lat: start.lat, lng: start.lng })
      .then((rows) => setList(filterByCity(Array.isArray(rows) ? rows : [], cityId))) // the server already filters; this keeps a stale saved copy honest
      .catch(() => setFailed(true));
  }, [cityId, start]);
  useEffect(load, [load]);

  const rows = list || [];
  return (
    <div className="space-y-4 text-ht-text">
      <h1 className="text-2xl font-bold">{t('nav.hospitals')}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <DataSourceBadge source="simulated" />
        {city && <StatusChip tone="info" icon="pin">{t('city.showing', { name: city.city_name + ', ' + city.state })}</StatusChip>}
      </div>
      <p className="text-ht-muted">{t('hosp.intro')}</p>
      <Panel aria-label={t('city.label')}><CityChooser themed /></Panel>
      {status === 'error' && <p role="alert">{t('city.loadError')}</p>}
      {city && <p className="text-sm text-ht-muted">{t('city.simLocation', { name: city.city_name, label: city.simulation_start.label })}</p>}
      {failed && <Panel role="alert"><p>{t('hosp.error')}</p><button type="button" onClick={load} className="mt-2 min-h-[44px] rounded-xl border-2 border-ht-line px-4 font-semibold">{t('hosp.retry')}</button></Panel>}
      {!failed && list === null && city && <p role="status">{t('hosp.loading')}</p>}
      {list && rows.length === 0 && <p>{t('hosp.empty', { name: city.city_name })}</p>}
      {list && rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <CityMap city={city} hospitals={rows} start={start} label={t('hosp.mapLabel', { name: city.city_name, n: rows.length })} />
          <ol className="space-y-3" aria-label={t('nav.hospitals')}>
            {rows.map((h, i) => (
              <li key={h.id}>
                <Panel as="div">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ht-accent font-bold text-ht-onaccent">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-lg font-bold">{h.name}</h2>
                      <p className="break-words text-sm text-ht-muted">{h.address}</p>
                      <p className="mt-1 text-sm"><span className="num">{t('hosp.distance', { km: Number(h.distance_km).toFixed(1) })}</span> · <span className="num">{t('hosp.beds', { n: h.availability && h.availability.beds_free })}</span></p>
                      <ul className="mt-2 flex flex-wrap gap-2" aria-label={t('hosp.capabilities')}>
                        {CAPS.filter((c) => h.capabilities && h.capabilities[c]).map((c) => <li key={c}><StatusChip tone="ok" icon="check">{t('hosp.cap.' + c)}</StatusChip></li>)}
                      </ul>
                      <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-ht-muted"><Icon name="info" size={14} />{t('badge.simulated')}</p>
                    </div>
                  </div>
                </Panel>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
