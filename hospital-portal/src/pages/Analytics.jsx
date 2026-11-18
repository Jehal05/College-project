// Analytics dashboard (feature #30). Every number is worked out from the stored timeline
// events of the cases (see services/analytics.js). Nothing here is typed in by hand.
import { useMemo, useState } from 'react';
import { useHistory } from '../components/HistoryProvider.jsx';
import { useAmbulances } from '../components/AmbulanceProvider.jsx';
import { CityLabel } from '../components/CityBar.jsx';
import { useCityScope } from '../components/useCityScope.js';
import BarChart, { PALETTE } from '../components/BarChart.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { summarise, stepSpreads, filterByDate, STEPS, MIN_SPREAD_N } from '../services/analytics.js';
import { analyticsToCsv } from '../services/csv.js';
import { downloadText } from '../services/download.js';
import Button from '../components/ui/Button.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import { EMERGENCY_TYPES } from '../services/contract.js';
import { useT } from '../i18n/index.js';
import { stateText, severityText, typeText, durationText } from '../i18n/phrases.js';

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
  const { cases: allCases, loading, error } = useHistory();
  const { ambulances: allAmbulances } = useAmbulances();
  const cityScope = useCityScope();
  const [range, setRange] = useState({ from: '', to: '' }); // 'YYYY-MM-DD', empty = no limit
  const inCity = useMemo(() => cityScope.alerts(allCases), [cityScope, allCases]);   // the chosen city first, then the date range
  const cases = useMemo(() => filterByDate(inCity, range), [inCity, range]);
  const ambulances = useMemo(() => cityScope.byCity(allAmbulances), [cityScope, allAmbulances]);
  const s = useMemo(() => summarise(cases, ambulances), [cases, ambulances]);
  const spreads = useMemo(() => stepSpreads(cases), [cases]);
  const samples = cases.filter((c) => c.sample).length;
  const filtered = Boolean(range.from || range.to);
  const badRange = Boolean(range.from && range.to && range.from > range.to);
  const stepName = (key) => (key === 'total' ? t('an.spread.total') : t(`an.step.${key}`));
  const setDate = (key) => (e) => setRange((r) => ({ ...r, [key]: e.target.value }));

  const stateRows = Object.entries(s.byState)
    .map(([state, value]) => ({ label: stateText(t, state).split(' · ')[0], value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{t('an.title')}</h1>
        <CityLabel />
        <SimulatedBadge text={t('an.badge')} />
        {loading && <span className="text-slate-500">{t('common.loading')}</span>}
      </div>
      {error && <ErrorState message={error} />}
      <div data-testid="date-filter" role="group" aria-label={t('an.filter.label')} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow">
        <label className="flex flex-col text-sm font-semibold text-slate-700">
          {t('an.filter.from')}
          <input data-testid="date-from" type="date" value={range.from} max={range.to || undefined} onChange={setDate('from')} className="mt-1 min-h-11 rounded-lg border border-slate-300 px-3 py-1.5 text-base font-normal" />
        </label>
        <label className="flex flex-col text-sm font-semibold text-slate-700">
          {t('an.filter.to')}
          <input data-testid="date-to" type="date" value={range.to} min={range.from || undefined} onChange={setDate('to')} className="mt-1 min-h-11 rounded-lg border border-slate-300 px-3 py-1.5 text-base font-normal" />
        </label>
        <Button variant="secondary" data-testid="date-clear" disabled={!filtered} onClick={() => setRange({ from: '', to: '' })}>{t('an.filter.clear')}</Button>
        <span data-testid="date-shown" role="status" className="font-semibold text-slate-700">{t('an.filter.shown', { n: cases.length, total: allCases.length })}</span>
        <Button data-testid="analytics-csv" className="ml-auto" disabled={badRange || cases.length === 0} title={t('an.csvNote')}
          onClick={() => downloadText(`analytics-simulated-${new Date().toISOString().slice(0, 10)}.csv`, analyticsToCsv(s, spreads, { ...range, stepLabel: stepName }), 'text/csv;charset=utf-8')}>
          {t('an.csv')}
        </Button>
        {badRange && <p role="alert" className="w-full font-semibold text-red-800">{t('an.filter.bad')}</p>}
      </div>
      <p data-testid="data-source" className="rounded-xl bg-sky-50 p-3 text-slate-700">
        {t(s.total === 1 ? 'an.sourceOne' : 'an.source', { n: s.total, extra: samples > 0 ? t('an.samples', { n: samples }) : '' })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile testId="tile-total" label={t('an.emerg')} value={s.total} note={t('an.stillOpen', { n: s.open })} />
        <Tile testId="tile-finished" label={t('an.handed')} value={s.finished} />
        <Tile testId="tile-cancelled" label={t('an.cancelled')} value={s.cancelled} />
        <Tile testId="tile-escalations" label={t('an.escalated')} value={s.escalations.cases} note={s.escalations.times === 1 ? t('an.timesOne') : t('an.timesMany', { n: s.escalations.times })} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BarChart
          testId="chart-type"
          title={t('an.byType')}
          axisLabel={t('an.axisNum')}
          rows={EMERGENCY_TYPES.map((ty, i) => ({ label: typeText(t, ty), value: s.byType[ty] || 0, color: PALETTE[i] }))}
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
          return { label: t(`an.step.${step.key}`), value: a.seconds ?? 0, text: a.seconds === null ? t('an.noData') : `${durationText(t, a.seconds)} (${a.count})` };
        })}
      />
      <section data-testid="spread" className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-1 text-2xl font-bold">{t('an.spread.title')}</h2>
        <p className="mb-3 text-slate-600">{t('an.spread.note', { min: MIN_SPREAD_N })}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-lg">
            <thead className="bg-slate-100 text-sm uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2">{t('an.spread.step')}</th>
                <th scope="col" className="px-3 py-2">{t('an.spread.n')}</th>
                <th scope="col" className="px-3 py-2">{t('an.spread.avg')}</th>
                <th scope="col" className="px-3 py-2">{t('an.spread.median')}</th>
                <th scope="col" className="px-3 py-2">{t('an.spread.p90')}</th>
              </tr>
            </thead>
            <tbody>
              {[...STEPS.map((x) => x.key), 'total'].map((key) => {
                const row = spreads[key];
                const cell = (v) => (v === null ? <span className="text-slate-500">{row.n === 0 ? t('an.noData') : t('an.spread.notEnough')}</span> : durationText(t, v));
                return (
                  <tr key={key} data-testid={`spread-${key}`} className="border-t border-slate-200">
                    <th scope="row" className="px-3 py-2 font-semibold">{stepName(key)}</th>
                    <td data-testid="spread-n" className="px-3 py-2 tabular-nums">{row.n}</td>
                    <td data-testid="spread-avg" className="px-3 py-2">{row.average === null ? <span className="text-slate-500">{t('an.noData')}</span> : durationText(t, row.average)}</td>
                    <td data-testid="spread-median" className="px-3 py-2">{cell(row.median)}</td>
                    <td data-testid="spread-p90" className="px-3 py-2">{cell(row.p90)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-slate-500">
        {t('an.bracket')}
        {s.averageTotal.seconds !== null && <> {t('an.avgTotal', { time: durationText(t, s.averageTotal.seconds), n: s.averageTotal.count })}</>}
      </p>
    </div>
  );
}
