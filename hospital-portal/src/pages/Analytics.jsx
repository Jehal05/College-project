// Analytics dashboard (feature #30). Every number is worked out from the stored timeline
// events of the cases (see services/analytics.js). Nothing here is typed in by hand.
import { useMemo } from 'react';
import { useHistory } from '../components/HistoryProvider.jsx';
import { useAmbulances } from '../components/AmbulanceProvider.jsx';
import BarChart, { PALETTE } from '../components/BarChart.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { summarise, STEPS } from '../services/analytics.js';
import { formatSeconds } from '../services/report.js';
import { EMERGENCY_TYPES, TYPE_LABELS } from '../services/contract.js';
import { useT } from '../i18n/index.js';
import { stateText, severityText } from '../i18n/phrases.js';

const SEVERITY_COLORS = { EMERGENCY: '#D55E00', URGENT: '#E69F00', WATCH: '#0072B2' };

function Tile({ label, value, testId, note }) {
  return (
    <div data-testid={testId} className="rounded-2xl bg-white p-5 shadow">
      <div className="text-lg text-slate-600">{label}</div>
      <div data-testid="tile-value" className="text-5xl font-bold">{value}</div>
      {note && <div className="mt-1 text-sm text-slate-500">{note}</div>}
    </div>
  );
}

export default function Analytics() {
  const t = useT();
  const { cases, loading, error } = useHistory();
  const { ambulances } = useAmbulances();
  const s = useMemo(() => summarise(cases, ambulances), [cases, ambulances]);
  const samples = cases.filter((c) => c.sample).length;

  const stateRows = Object.entries(s.byState)
    .map(([state, value]) => ({ label: stateText(t, state).split(' · ')[0], value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{t('an.title')}</h1>
        <SimulatedBadge text={t('an.badge')} />
        {loading && <span className="text-slate-500">{t('common.loading')}</span>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
      <p data-testid="data-source" className="rounded-xl bg-sky-50 p-3 text-slate-700">
        {t(s.total === 1 ? 'an.sourceOne' : 'an.source', { n: s.total, extra: samples > 0 ? t('an.samples', { n: samples }) : '' })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile testId="tile-total" label={t('an.emerg')} value={s.total} note={t('an.stillOpen', { n: s.open })} />
        <Tile testId="tile-finished" label={t('an.handed')} value={s.finished} />
        <Tile testId="tile-cancelled" label={t('an.cancelled')} value={s.cancelled} />
        <Tile testId="tile-escalations" label={t('an.escalated')} value={s.escalations.cases} note={s.escalations.times === 1 ? t('an.timesOne') : t('an.timesMany', { n: s.escalations.times })} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BarChart
          testId="chart-type"
          title={t('an.byType')}
          axisLabel={t('an.axisNum')}
          rows={EMERGENCY_TYPES.map((ty, i) => ({ label: TYPE_LABELS[ty], value: s.byType[ty] || 0, color: PALETTE[i] }))}
        />
        <BarChart
          testId="chart-severity"
          title={t('an.bySeverity')}
          axisLabel={t('an.axisNum')}
          rows={Object.entries(s.bySeverity).map(([k, v]) => ({ label: severityText(t, k), value: v, color: SEVERITY_COLORS[k] }))}
        />
        <BarChart testId="chart-state" title={t('an.byState')} axisLabel={t('an.axisNum')} rows={stateRows} color={PALETTE[2]} />
        <BarChart
          testId="chart-ambulance"
          title={t('an.ambUse')}
          axisLabel={t('an.axisTrips')}
          emptyText={t('an.noAmb')}
          rows={s.ambulance.units.map((u) => ({ label: u.name, value: u.trips }))}
          color={PALETTE[3]}
        />
      </div>

      <BarChart
        testId="chart-steps"
        title={t('an.stepsTitle')}
        axisLabel={t('an.stepsAxis')}
        emptyText={t('an.noSteps')}
        color={PALETTE[0]}
        rows={STEPS.map((step) => {
          const a = s.averages[step.key];
          return { label: t(`an.step.${step.key}`), value: a.seconds ?? 0, text: a.seconds === null ? t('an.noData') : `${formatSeconds(a.seconds)} (${a.count})` };
        })}
      />
      <p className="text-slate-500">
        {t('an.bracket')}
        {s.averageTotal.seconds !== null && <> {t('an.avgTotal', { time: formatSeconds(s.averageTotal.seconds), n: s.averageTotal.count })}</>}
      </p>
    </div>
  );
}
