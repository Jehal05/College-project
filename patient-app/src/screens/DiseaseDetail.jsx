// One disease area: trends, linked reports, rule-based observation, data quality and general next steps to discuss with a doctor.
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useHealthData from '../hooks/useHealthData';
import { moduleByKey, STEP_COUNT } from '../config/diseases';
import { relatedConditions, relatedReports } from '../config/organs';
import { labsForOrgan } from '../utils/labs';
import LabValueList from '../components/themed/LabValueList';
import { summarize, STATUS_TONE, QUALITY_TONE } from './DiseaseHub';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import TrendChart from '../components/themed/TrendChart';
import NotFound from './NotFound';

export default function DiseaseDetail() {
  const { key } = useParams();
  const { t } = useTranslation();
  const data = useHealthData();
  const mod = moduleByKey(key);
  if (!mod) return <NotFound />;
  const s = summarize(mod, data);
  const name = t('dis.mod.' + mod.key + '.name');
  const conditions = relatedConditions(s.organ, data.patient && data.patient.conditions);
  const files = relatedReports(s.organ, data.reports);
  const organLabs = labsForOrgan(data.labs, s.organ.key);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/diseases" className="text-sm font-semibold text-ht-accent underline">{t('dis.back')}</Link>
          <h1 className="text-2xl font-extrabold">{name}</h1>
          <p className="text-ht-muted">{t('dis.mod.' + mod.key + '.about')}</p>
        </div>
        <DataSourceBadge source="simulated" />
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="obs-title">
          <h2 id="obs-title" className="mb-2 text-lg font-bold">{t('dis.obs.title')}</h2>
          <StatusChip tone={STATUS_TONE[s.status]}>{t('dis.status.' + s.status)}</StatusChip>
          <p className="mt-2 text-sm">{t('dis.obs.' + s.status, { name })}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {s.states.map((m) => (
              <li key={m.key} className="flex items-center justify-between gap-2">
                <span>{t('twin.' + m.key)}</span>
                <span className="num font-semibold">{m.value ?? '--'} {m.value != null ? t(m.unit) : ''}
                  {m.within !== null && <span className="ml-2 text-xs text-ht-muted">{t(m.within ? 'twin.within' : 'twin.different')}</span>}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-semibold text-ht-muted">{t('twin.notDiagnosis')}</p>
        </Panel>

        <Panel aria-labelledby="q-title">
          <h2 id="q-title" className="mb-2 text-lg font-bold">{t('dis.quality.title')}</h2>
          <StatusChip tone={QUALITY_TONE[s.quality.level]} icon="info">{t('dis.quality.' + s.quality.level)}</StatusChip>
          <p className="mt-2 text-sm">{t('dis.confidence.' + s.quality.level)}</p>
          {s.quality.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ht-muted">
              {s.quality.reasons.map((r) => <li key={r}>{t('dis.reason.' + r)}</li>)}
            </ul>
          )}
        </Panel>
      </div>

      {s.organ.metrics.filter((m) => m.series).length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {s.organ.metrics.filter((m) => m.series).map((m) => (
            <TrendChart key={m.key} name={t('twin.' + m.key)} unit={t(m.unit)} values={data.history[m.series] || []} band={m.range && data.baseline ? data.baseline[m.range] : null} />
          ))}
        </div>
      )}

      {organLabs.length > 0 && (
        <Panel aria-labelledby="lab-title"><h2 id="lab-title" className="mb-2 text-lg font-bold">{t('ri.confirmedShort')}</h2><LabValueList entries={organLabs} /></Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="rec-title">
          <h2 id="rec-title" className="mb-2 text-lg font-bold">{t('dtwin.conditions')} / {t('dtwin.reports')}</h2>
          {conditions.length ? <ul className="mb-2 flex flex-wrap gap-2">{conditions.map((c) => <li key={c}><StatusChip icon="info">{c}</StatusChip></li>)}</ul> : <p className="mb-2 text-sm text-ht-muted">{t('dtwin.noneLinked')}</p>}
          {files.length ? <ul className="space-y-1 text-sm">{files.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
            : <p className="text-sm text-ht-muted">{t('dtwin.noneLinked')} <Link to="/reports" className="font-semibold text-ht-accent underline">{t('dtwin.uploadReport')}</Link></p>}
        </Panel>
        <Panel aria-labelledby="steps-title">
          <h2 id="steps-title" className="mb-2 text-lg font-bold">{t('dis.steps.title')}</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {Array.from({ length: STEP_COUNT }, (_, i) => <li key={i}>{t('dis.steps.' + mod.key + '.' + (i + 1))}</li>)}
          </ol>
          <p className="mt-3 text-xs text-ht-muted">{t('dis.steps.note')}</p>
        </Panel>
      </div>
    </div>
  );
}
