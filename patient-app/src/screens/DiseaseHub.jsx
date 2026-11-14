// Disease Intelligence: six areas, each with a rule-based observation and a data-quality note. Nothing here is a diagnosis or a risk score.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useHealthData from '../hooks/useHealthData';
import { MODULES } from '../config/diseases';
import { organByKey, relatedConditions, relatedReports } from '../config/organs';
import { metricStates, areaStatus, dataQuality } from '../utils/diseaseIntel';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import Icon from '../components/icons';

export const STATUS_TONE = { within: 'ok', different: 'caution', nodata: 'neutral', waiting: 'neutral' };
export const QUALITY_TONE = { good: 'ok', medium: 'info', low: 'caution' };

export function summarize(mod, data) {
  const organ = organByKey(mod.organ);
  const states = metricStates(organ, data);
  const readings = Math.max(0, ...organ.metrics.filter((m) => m.series).map((m) => (data.history[m.series] || []).length));
  const quality = dataQuality({
    hasMetrics: organ.metrics.some((m) => m.range),
    readings,
    hasBaseline: states.some((s) => s.range),
    reports: relatedReports(organ, data.reports).length,
    conditions: relatedConditions(organ, data.patient && data.patient.conditions).length,
  });
  return { organ, states, status: areaStatus(states), quality, readings };
}

export default function DiseaseHub() {
  const { t } = useTranslation();
  const data = useHealthData();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('nav.diseases')}</h1><p className="text-ht-muted">{t('dis.intro')}</p></div>
        <DataSourceBadge source="simulated" />
      </header>
      <p className="rounded-xl border border-ht-line bg-ht-card p-3 text-sm text-ht-muted">{t('dis.rules')}</p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((m) => {
          const s = summarize(m, data);
          return (
            <li key={m.key}>
              <Panel className="flex h-full flex-col gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name={m.icon} size={20} />{t('dis.mod.' + m.key + '.name')}</h2>
                <p className="text-sm text-ht-muted">{t('dis.mod.' + m.key + '.about')}</p>
                <div className="flex flex-wrap gap-2">
                  <StatusChip tone={STATUS_TONE[s.status]}>{t('dis.status.' + s.status)}</StatusChip>
                  <StatusChip tone={QUALITY_TONE[s.quality.level]} icon="info">{t('dis.quality.' + s.quality.level)}</StatusChip>
                </div>
                <Link to={'/diseases/' + m.key} className="mt-auto inline-flex min-h-[44px] items-center justify-center rounded-xl border border-ht-line px-4 text-sm font-semibold text-ht-accent hover:border-ht-accent">{t('dis.open')}</Link>
              </Panel>
            </li>
          );
        })}
      </ul>
      <p className="text-xs font-semibold text-ht-muted">{t('twin.notDiagnosis')}</p>
    </div>
  );
}
