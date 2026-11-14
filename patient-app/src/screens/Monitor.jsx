// Live Monitoring: a made-up ECG-like trace, the live trends, the wearable connection and a short in-memory event timeline.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useHealthData from '../hooks/useHealthData';
import useMonitorEvents from '../hooks/useMonitorEvents';
import useTheme from '../hooks/useTheme';
import { ORGANS } from '../config/organs';
import { metricStates } from '../utils/diseaseIntel';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import TrendChart from '../components/themed/TrendChart';
import EcgStrip from '../components/themed/EcgStrip';

const SERIES = [['heart_rate', 'overview.unit.bpm', 'heart_rate'], ['spo2', 'overview.unit.percent', 'spo2'], ['bp_sys', 'overview.unit.mmhg', 'bp_systolic'], ['glucose', 'overview.unit.glucose', 'glucose']];
const LABEL = { heart_rate: 'heart_rate', spo2: 'spo2', bp_sys: 'bp', glucose: 'glucose' };
const ALL_METRICS = { metrics: ORGANS.flatMap((o) => o.metrics).filter((m, i, a) => a.findIndex((x) => x.key === m.key) === i) };

export default function Monitor() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const data = useHealthData();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const rows = metricStates(ALL_METRICS, data);
  const events = useMonitorEvents(rows, data.connected);
  const bpm = data.vitals && typeof data.vitals.heart_rate === 'number' ? data.vitals.heart_rate : null;
  const stamp = data.vitals && data.vitals.timestamp ? new Date(data.vitals.timestamp).getTime() : null;
  const ago = stamp ? Math.max(0, Math.round((now - stamp) / 1000)) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('nav.monitor')}</h1><p className="text-ht-muted">{t('mon.intro')}</p></div>
        <DataSourceBadge source="simulated" />
      </header>

      <Panel glow aria-labelledby="ecg-title">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="ecg-title" className="text-lg font-bold">{t('mon.ecg.title')}</h2>
          <StatusChip tone={data.connected ? 'ok' : 'caution'} icon={data.connected ? 'check' : 'alert'}>{t(data.connected ? 'mon.conn.on' : 'mon.conn.off')}</StatusChip>
        </div>
        <EcgStrip bpm={bpm} theme={theme} />
        <p className="mt-2 text-sm text-ht-muted">{t('mon.ecg.note')}</p>
        <p role="status" className="num mt-1 text-sm">{bpm != null ? t('mon.latest', { bpm }) : t('mon.waiting')}{ago != null ? ' · ' + t('mon.ago', { s: ago }) : ''}</p>
      </Panel>

      {!data.sharing && <p role="status" className="rounded-xl border border-ht-warning/60 bg-ht-warning/10 p-3 text-sm">{t('mon.noShare')}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {SERIES.map(([series, unit, range]) => (
          <TrendChart key={series} name={t('twin.' + LABEL[series])} unit={t(unit)} values={data.history[series] || []} band={data.baseline ? data.baseline[range] : null} />
        ))}
      </div>

      <Panel aria-labelledby="ev-title">
        <h2 id="ev-title" className="mb-2 text-lg font-bold">{t('mon.events.title')}</h2>
        {events.length === 0 ? <p className="text-sm text-ht-muted">{t('mon.events.empty')}</p> : (
          <ul className="space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="num text-ht-muted">{e.at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <StatusChip tone={e.type === 'left' || e.type === 'disconnected' ? 'caution' : 'ok'}>{t('mon.event.' + e.type, { name: e.key ? t('twin.' + e.key) : '' })}</StatusChip>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ht-muted">{t('mon.events.note')}</p>
      </Panel>
      <p className="text-xs font-semibold text-ht-muted">{t('twin.notDiagnosis')}</p>
    </div>
  );
}
