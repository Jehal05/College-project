// Patient overview (themed): greeting, live tiles, data completeness, trends, observations, reports, reminders and quick emergency access.
// Every number is simulated in this prototype and says so. Nothing here is a diagnosis.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useVitals from '../hooks/useVitals';
import useBaseline from '../hooks/useBaseline';
import useConsents from '../hooks/useConsents';
import useReports from '../hooks/useReports';
import useReminders from '../hooks/useReminders';
import useVitalsHistory from '../hooks/useVitalsHistory';
import { getContacts, getPatient } from '../services/api';
import { twinRows } from '../utils/twin';
import { bandFor } from '../utils/trend';
import { bpText, completeness, observations, upcoming } from '../utils/overview';
import { nextDue } from '../utils/reminderSchedule';
import { currentLocale, formatDate } from '../utils/time';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import MetricTile from '../components/themed/MetricTile';
import TrendChart from '../components/themed/TrendChart';
import Icon from '../components/icons';

const TILES = [['heart_rate', 'heart', 'overview.unit.bpm'], ['spo2', 'drop', 'overview.unit.percent'], ['bp', 'activity', 'overview.unit.mmhg'], ['glucose', 'bolt', 'overview.unit.glucose']];
const CHARTS = [['heart_rate', 'overview.unit.bpm'], ['spo2', 'overview.unit.percent'], ['bp_sys', 'overview.unit.mmhg'], ['glucose', 'overview.unit.glucose']];
const CHART_NAME = { heart_rate: 'twin.heart_rate', spo2: 'twin.spo2', bp_sys: 'overview.bpSystolic', glucose: 'twin.glucose' };

export default function Overview() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const id = session.patient_id;
  const { vitals, connected } = useVitals();
  const { baseline } = useBaseline(id);
  const { consents } = useConsents(id);
  const sharing = !!consents && consents.vitals === true;
  const history = useVitalsHistory(vitals, sharing);
  const { reports } = useReports(id);
  const { list: reminders } = useReminders(id);
  const [patient, setPatient] = useState(null);
  const [contacts, setContacts] = useState(null);

  useEffect(() => {
    getPatient(id).then(setPatient).catch(() => {});
    getContacts(id).then(setContacts).catch(() => {});
  }, [id]);

  const rows = vitals && baseline ? twinRows({ ...vitals, bp: bpText(vitals) }, baseline) : [];
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  const value = (k) => (k === 'bp' ? bpText(vitals) : vitals ? vitals[k] : null);
  const obs = observations(rows);
  const done = completeness({ patient, contacts, reports, baseline, reminders, vitals });
  const next = upcoming(reminders, new Date(), nextDue);
  const readings = history.heart_rate.length;
  const recent = [...reports].sort((a, b) => String(b.uploaded_at).localeCompare(String(a.uploaded_at))).slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{patient ? t('home.greeting', { name: patient.name }) : t('overview.title')}</h1>
          <p className="text-ht-muted">{t('overview.title')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={connected ? 'ok' : 'caution'} icon={connected ? 'check' : 'alert'}>{connected ? t('overview.twinOnline') : t('overview.twinOffline')}</StatusChip>
          <DataSourceBadge source="simulated" />
        </div>
      </header>

      <section aria-label={t('overview.live')} className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {TILES.map(([k, icon, unit]) => {
          const r = byKey[k];
          return <MetricTile key={k} icon={icon} label={t('twin.' + k)} value={value(k)} unit={t(unit)}
            within={r ? r.within : null} note={r ? (r.within ? t('twin.within') : t('twin.different')) : t('overview.waiting')} />;
        })}
        <MetricTile icon="activity" label={t('overview.steps')} value={null} note={t('overview.stepsNone')} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel glow className="lg:col-span-2" aria-labelledby="ov-summary">
          <h2 id="ov-summary" className="mb-1 text-lg font-bold">{t('overview.summary.title')}</h2>
          <p className="text-ht-muted">{t('overview.summary.text')}</p>
          <p className="mt-2 text-xs font-semibold text-ht-muted">{t('twin.notDiagnosis')}</p>
        </Panel>
        <Panel aria-labelledby="ov-complete">
          <h2 id="ov-complete" className="mb-2 text-lg font-bold">{t('overview.complete.title')}</h2>
          <p className="num text-3xl font-extrabold">{done.percent}%</p>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={done.percent} aria-label={t('overview.complete.title')} className="my-2 h-2 overflow-hidden rounded-full bg-ht-bg">
            <div className="h-full bg-ht-accent2" style={{ width: done.percent + '%' }} />
          </div>
          <p className="text-sm text-ht-muted">{done.missing.length ? t('overview.complete.missing', { list: done.missing.map((m) => t('overview.item.' + m)).join(', ') }) : t('overview.complete.all')}</p>
        </Panel>
      </div>

      <section aria-labelledby="ov-trends">
        <h2 id="ov-trends" className="mb-3 text-lg font-bold">{t('overview.trends')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {CHARTS.map(([k, unit]) => <TrendChart key={k} name={t(CHART_NAME[k])} unit={t(unit)} values={history[k] || []} band={baseline ? bandFor(k, baseline) : null} />)}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="ov-obs">
          <h2 id="ov-obs" className="mb-2 text-lg font-bold">{t('overview.obs.title')}</h2>
          {obs.length === 0 ? <p className="text-ht-muted">{t('overview.obs.none')}</p> : (
            <ul className="space-y-2">
              {obs.map((o) => (
                <li key={o.key}><StatusChip tone={o.within ? 'ok' : 'caution'}>{t(o.within ? 'overview.obs.within' : 'overview.obs.diff', { name: t('twin.' + o.key) })}</StatusChip></li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ht-muted">{t('overview.obs.note', { count: readings })}</p>
        </Panel>

        <Panel aria-labelledby="ov-reports">
          <h2 id="ov-reports" className="mb-2 text-lg font-bold">{t('overview.reports.title')}</h2>
          {recent.length === 0 ? <p className="text-ht-muted">{t('overview.reports.none')}</p> : (
            <ul className="space-y-2">{recent.map((r) => <li key={r.id} className="flex items-center gap-2"><Icon name="file" size={18} /><span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span><span className="text-sm text-ht-muted">{formatDate(r.uploaded_at)}</span></li>)}</ul>
          )}
          <Link to="/reports" className="mt-3 inline-block min-h-[44px] font-semibold text-ht-accent underline">{t('overview.reports.all')}</Link>
        </Panel>

        <Panel aria-labelledby="ov-meds">
          <h2 id="ov-meds" className="mb-2 text-lg font-bold">{t('overview.meds.title')}</h2>
          {next.length === 0 ? <p className="text-ht-muted">{t('overview.meds.none')}</p> : (
            <ul className="space-y-2">{next.map((m) => <li key={m.id} className="flex items-center gap-2"><Icon name="pill" size={18} />{t('overview.meds.next', { name: m.name, time: m.at.toLocaleTimeString(currentLocale(), { hour: 'numeric', minute: '2-digit' }) })}</li>)}</ul>
          )}
          <Link to="/reminders" className="mt-3 inline-block min-h-[44px] font-semibold text-ht-accent underline">{t('overview.meds.all')}</Link>
        </Panel>

        <Panel aria-labelledby="ov-sos" className="border-ht-emergency/60">
          <h2 id="ov-sos" className="mb-1 text-lg font-bold">{t('overview.sos.title')}</h2>
          <p className="mb-3 text-ht-muted">{t('overview.sos.text')}</p>
          <Link to="/symptoms" className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-lg font-extrabold text-white hover:bg-red-800">
            <Icon name="heart" size={24} />{t('home.emergency')}
          </Link>
        </Panel>
      </div>
    </div>
  );
}
