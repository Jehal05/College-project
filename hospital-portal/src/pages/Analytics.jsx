// Analytics dashboard (feature #30). Every number is worked out from the stored timeline
// events of the cases (see services/analytics.js). Nothing here is typed in by hand.
import { useMemo } from 'react';
import { useHistory } from '../components/HistoryProvider.jsx';
import { useAmbulances } from '../components/AmbulanceProvider.jsx';
import BarChart, { PALETTE } from '../components/BarChart.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { summarise, STEPS } from '../services/analytics.js';
import { formatSeconds } from '../services/report.js';
import { EMERGENCY_TYPES, TYPE_LABELS, STATE_LABELS } from '../services/contract.js';

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
  const { cases, loading, error } = useHistory();
  const { ambulances } = useAmbulances();
  const s = useMemo(() => summarise(cases, ambulances), [cases, ambulances]);
  const samples = cases.filter((c) => c.sample).length;

  const stateRows = Object.entries(s.byState)
    .map(([state, value]) => ({ label: (STATE_LABELS[state] || state).split(' · ')[0], value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <SimulatedBadge text="Simulated cases" />
        {loading && <span className="text-slate-500">Loading…</span>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
      <p data-testid="data-source" className="rounded-xl bg-sky-50 p-3 text-slate-700">
        Worked out from the stored timeline of {s.total} case{s.total === 1 ? '' : 's'}
        {samples > 0 ? `, including ${samples} sample past cases made up for the demo` : ''}. All values are simulated.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile testId="tile-total" label="Emergencies" value={s.total} note={`${s.open} still open`} />
        <Tile testId="tile-finished" label="Handed over" value={s.finished} />
        <Tile testId="tile-cancelled" label="Cancelled (false alarm)" value={s.cancelled} />
        <Tile testId="tile-escalations" label="Escalated to next hospital" value={s.escalations.cases} note={`${s.escalations.times} time${s.escalations.times === 1 ? '' : 's'} in total`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BarChart
          testId="chart-type"
          title="Emergencies by type"
          axisLabel="Number of emergencies"
          rows={EMERGENCY_TYPES.map((t, i) => ({ label: TYPE_LABELS[t], value: s.byType[t] || 0, color: PALETTE[i] }))}
        />
        <BarChart
          testId="chart-severity"
          title="Emergencies by severity"
          axisLabel="Number of emergencies"
          rows={Object.entries(s.bySeverity).map(([k, v]) => ({ label: k, value: v, color: SEVERITY_COLORS[k] }))}
        />
        <BarChart testId="chart-state" title="Emergencies by state" axisLabel="Number of emergencies" rows={stateRows} color={PALETTE[2]} />
        <BarChart
          testId="chart-ambulance"
          title="Ambulance use"
          axisLabel="Trips per unit"
          emptyText="Not enough data yet. No ambulance has been sent."
          rows={s.ambulance.units.map((u) => ({ label: u.name, value: u.trips }))}
          color={PALETTE[3]}
        />
      </div>

      <BarChart
        testId="chart-steps"
        title="Average time for each step"
        axisLabel="Average time (shorter is faster)"
        emptyText="Not enough data yet. No emergency has reached these steps."
        color={PALETTE[0]}
        rows={STEPS.map((step) => {
          const a = s.averages[step.key];
          return { label: step.label, value: a.seconds ?? 0, text: a.seconds === null ? 'No data' : `${formatSeconds(a.seconds)} (${a.count})` };
        })}
      />
      <p className="text-slate-500">
        The number in brackets is how many cases the average is based on.
        {s.averageTotal.seconds !== null && <> Average total time from alert to the end: <b>{formatSeconds(s.averageTotal.seconds)}</b> ({s.averageTotal.count} cases).</>}
      </p>
    </div>
  );
}
