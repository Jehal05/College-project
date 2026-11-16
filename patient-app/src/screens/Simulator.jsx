// Health Simulator: baseline vs a hypothetical value, against the person's own usual range. Hypothetical, not a prediction.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useHealthData from '../hooks/useHealthData';
import { SIM_METRICS, clamp, compare, spread, startValue, wouldLeave } from '../utils/simulator';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';

const TONE = { within: 'ok', outside: 'caution' };
const input = 'min-h-[44px] w-24 rounded-xl border border-ht-line bg-ht-bg px-2 text-center text-ht-text';

export default function Simulator() {
  const { t } = useTranslation();
  const data = useHealthData();
  const [edits, setEdits] = useState({}); // only what the person changed; everything else follows the latest reading
  const hypo = (m) => (edits[m.key] !== undefined ? edits[m.key] : startValue(m, data.history, data.baseline));
  const rows = useMemo(() => SIM_METRICS.map((m) => compare(m, data, hypo(m))), [data.history, data.baseline, edits]); // eslint-disable-line react-hooks/exhaustive-deps
  const leaving = wouldLeave(rows);
  const set = (m, v) => { const n = Number(v); if (Number.isFinite(n)) setEdits({ ...edits, [m.key]: clamp(n, m.min, m.max) }); };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('nav.simulator')}</h1><p className="text-ht-muted">{t('sim.intro')}</p></div>
        <div className="flex flex-wrap gap-2"><DataSourceBadge source="simulated" /><StatusChip tone="caution" icon="info">{t('sim.hypothetical')}</StatusChip></div>
      </header>
      <p role="note" className="rounded-xl border border-ht-line bg-ht-card p-3 text-sm">{t('sim.notPrediction')}</p>

      <Panel glow aria-labelledby="sim-controls">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="sim-controls" className="text-lg font-bold">{t('sim.controls')}</h2>
          <button type="button" onClick={() => setEdits({})} className="min-h-[44px] rounded-xl border border-ht-line px-4 text-sm font-semibold hover:border-ht-accent">{t('sim.reset')}</button>
        </div>
        <div className="space-y-5">
          {SIM_METRICS.map((m) => {
            const v = hypo(m); const name = t('twin.' + m.key);
            return (
              <div key={m.key}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={'sl-' + m.key} className="font-semibold">{name}</label>
                  <span className="flex items-center gap-2">
                    <input aria-label={t('sim.valueLabel', { name })} type="number" inputMode="decimal" min={m.min} max={m.max} step={m.step} value={v} onChange={(e) => set(m, e.target.value)} className={input} />
                    <span className="text-sm text-ht-muted">{t(m.unit)}</span>
                  </span>
                </div>
                <input id={'sl-' + m.key} type="range" min={m.min} max={m.max} step={m.step} value={v} aria-valuetext={v + ' ' + t(m.unit)} onChange={(e) => set(m, e.target.value)} className="mt-2 w-full accent-ht-accent" />
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel aria-labelledby="sim-compare">
        <h2 id="sim-compare" className="mb-2 text-lg font-bold">{t('sim.compare')}</h2>
        <div className="overflow-x-auto" tabIndex={0}>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead><tr className="text-ht-muted"><th scope="col" className="py-1 pr-2">{t('sim.col.metric')}</th><th scope="col">{t('sim.col.baseline')}</th><th scope="col">{t('sim.col.hypo')}</th><th scope="col">{t('sim.col.usual')}</th><th scope="col">{t('sim.col.where')}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} data-testid={'sim-row-' + r.key} className="border-t border-ht-line">
                  <th scope="row" className="py-2 pr-2 font-semibold">{t('twin.' + r.key)}</th>
                  <td className="num">{r.base ?? '--'}</td>
                  <td className="num font-bold">{r.hypo}{r.change !== null && r.change !== 0 ? <span className="ml-1 text-xs text-ht-muted">({r.change > 0 ? '+' : ''}{r.change})</span> : null}</td>
                  <td className="num">{r.range ? r.range.min + '–' + r.range.max : t('sim.noRange')}</td>
                  <td>{r.hypoStatus ? <StatusChip tone={TONE[r.hypoStatus]}>{t('sim.where.' + r.hypoStatus)}</StatusChip> : <span className="text-ht-muted">{t('sim.noRange')}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold">
          {leaving.length ? t('sim.summaryOut', { names: leaving.map((k) => t('twin.' + k)).join(', ') }) : t('sim.summaryIn')}
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="sim-assume">
          <h2 id="sim-assume" className="mb-2 text-lg font-bold">{t('sim.assumptions')}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">{[1, 2, 3, 4].map((i) => <li key={i}>{t('sim.assume.' + i)}</li>)}</ul>
        </Panel>
        <Panel aria-labelledby="sim-unc">
          <h2 id="sim-unc" className="mb-2 text-lg font-bold">{t('sim.uncertainty')}</h2>
          <p className="mb-2 text-sm text-ht-muted">{t('sim.uncertaintyHelp')}</p>
          <ul className="space-y-1 text-sm">
            {SIM_METRICS.map((m) => { const s = spread(data.history[m.series]); return (
              <li key={m.key} className="flex justify-between gap-2"><span>{t('twin.' + m.key)}</span>
                <span className="num">{s ? t('sim.spread', { min: s.min, max: s.max, n: s.count }) : t('sim.noReadings')}</span></li>
            ); })}
          </ul>
        </Panel>
      </div>
      <p className="text-xs font-semibold text-ht-muted">{t('twin.notDiagnosis')}</p>
    </div>
  );
}
