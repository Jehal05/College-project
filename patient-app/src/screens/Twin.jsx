// My Digital Twin (2D): body map in the centre, organ list on the left, the chosen organ's information on the right,
// and a replay of the last minute of readings at the bottom. All readings are simulated; nothing here is a diagnosis.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useVitals from '../hooks/useVitals';
import useBaseline from '../hooks/useBaseline';
import useConsents from '../hooks/useConsents';
import useReports from '../hooks/useReports';
import useVitalsHistory from '../hooks/useVitalsHistory';
import useReplay from '../hooks/useReplay';
import { getPatient } from '../services/api';
import { ORGANS, organByKey, relatedConditions, relatedReports } from '../config/organs';
import { inRange } from '../utils/twin';
import { bpText } from '../utils/overview';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import BodyMap from '../components/themed/BodyMap';
import TrendChart from '../components/themed/TrendChart';
import Icon from '../components/icons';

const btn = 'min-h-[44px] rounded-xl border border-ht-line bg-ht-card px-4 text-sm font-semibold text-ht-text hover:border-ht-accent';

export default function Twin() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const id = session.patient_id;
  const { vitals } = useVitals();
  const { baseline } = useBaseline(id);
  const { consents } = useConsents(id);
  const history = useVitalsHistory(vitals, !!consents && consents.vitals === true);
  const { reports } = useReports(id);
  const [patient, setPatient] = useState(null);
  const [selected, setSelected] = useState('heart');
  const [focus, setFocus] = useState(false);
  const total = history.heart_rate.length;
  const replay = useReplay(total);
  useEffect(() => { getPatient(id).then(setPatient).catch(() => {}); }, [id]);

  const organ = organByKey(selected);
  const upTo = (k) => (history[k] || []).slice(0, replay.shown + 1);
  const at = (k) => { const v = history[k] || []; return v.length ? v[Math.min(replay.shown, v.length - 1)] : null; };
  const liveValue = (m) => {
    if (m.series && total) return at(m.series);
    if (m.key === 'bp') return vitals ? bpText(vitals) : null;
    return vitals ? vitals[m.key] ?? null : null;
  };
  const conditions = relatedConditions(organ, patient && patient.conditions);
  const files = relatedReports(organ, reports);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('nav.twin')}</h1><p className="text-ht-muted">{t('dtwin.intro')}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone="info" icon="user">{t('dtwin.view2d')}</StatusChip>
          <button type="button" disabled className={btn + ' opacity-60'} title={t('dtwin.view3dSoon')}>{t('dtwin.view3d')}</button>
          <DataSourceBadge source="simulated" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_340px]">
        <nav aria-label={t('dtwin.organs')}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ht-muted">{t('dtwin.organs')}</h2>
          <ul className="space-y-2">
            {ORGANS.map((o) => (
              <li key={o.key}>
                <button type="button" aria-pressed={selected === o.key} onClick={() => setSelected(o.key)}
                  className={'flex min-h-[44px] w-full items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition-colors duration-ht ' +
                    (selected === o.key ? 'border-ht-accent bg-ht-accent/15 text-ht-accent' : 'border-ht-line bg-ht-card text-ht-text hover:border-ht-accent')}>
                  <Icon name={selected === o.key ? 'check' : 'chevron'} size={16} />{t('dtwin.organ.' + o.key + '.name')}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" aria-pressed={focus} onClick={() => setFocus(!focus)} className={btn + ' mt-3 w-full'}>{focus ? t('dtwin.focusOff') : t('dtwin.focusOn')}</button>
        </nav>

        <Panel glow className="flex items-center justify-center" aria-label={t('dtwin.mapTitle')}>
          <BodyMap selected={selected} onSelect={setSelected} focus={focus} />
        </Panel>

        <Panel aria-live="polite" aria-labelledby="organ-name">
          <h2 id="organ-name" className="text-xl font-bold">{t('dtwin.organ.' + selected + '.name')}</h2>
          <p className="mb-3 text-sm text-ht-muted">{t('dtwin.organ.' + selected + '.purpose')}</p>

          {organ.metrics.length === 0 ? (
            <p className="mb-3 rounded-xl bg-ht-bg p-3 text-sm text-ht-muted">{t('dtwin.noLive')}</p>
          ) : organ.metrics.map((m) => {
            const v = liveValue(m);
            const range = m.range && baseline ? baseline[m.range] : null;
            const within = range && typeof v === 'number' ? inRange(v, range) : null;
            return (
              <div key={m.key} className="mb-3">
                <p className="flex items-center justify-between gap-2"><span className="font-semibold">{t('twin.' + m.key)}</span>
                  <span className="num text-2xl font-extrabold">{v ?? '--'} <span className="text-sm font-semibold text-ht-muted">{v != null ? t(m.unit) : ''}</span></span></p>
                {within !== null && <StatusChip tone={within ? 'ok' : 'caution'}>{t(within ? 'twin.within' : 'twin.different')}</StatusChip>}
                {m.series && <div className="mt-2"><TrendChart name={t('twin.' + m.key)} unit={t(m.unit)} values={upTo(m.series)} band={range} /></div>}
              </div>
            );
          })}

          <h3 className="mt-3 text-sm font-bold">{t('dtwin.conditions')}</h3>
          {conditions.length ? <ul className="mb-2 flex flex-wrap gap-2">{conditions.map((c) => <li key={c}><StatusChip tone="neutral" icon="info">{c}</StatusChip></li>)}</ul>
            : <p className="mb-2 text-sm text-ht-muted">{t('dtwin.noneLinked')}</p>}
          <h3 className="text-sm font-bold">{t('dtwin.reports')}</h3>
          {files.length ? <ul className="mb-2 space-y-1 text-sm">{files.map((r) => <li key={r.id} className="flex items-center gap-2"><Icon name="file" size={16} />{r.name}</li>)}</ul>
            : <p className="mb-2 text-sm text-ht-muted">{t('dtwin.noneLinked')} <Link to="/reports" className="font-semibold text-ht-accent underline">{t('dtwin.uploadReport')}</Link></p>}
          {selected !== 'heart' && organ.metrics.length === 0 && <p className="mt-2 text-xs text-ht-muted">{t('dtwin.noLab')}</p>}
          <p className="mt-3 text-xs font-semibold text-ht-muted">{t('twin.notDiagnosis')}</p>
        </Panel>
      </div>

      <Panel aria-labelledby="replay-title">
        <h2 id="replay-title" className="mb-1 text-lg font-bold">{t('dtwin.replay.title')}</h2>
        <p className="mb-3 text-sm text-ht-muted">{total ? t('dtwin.replay.help') : t('dtwin.replay.empty')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={total < 2} onClick={replay.playing ? replay.pause : replay.play} className={btn + ' disabled:opacity-50'}>{replay.playing ? t('dtwin.replay.pause') : t('dtwin.replay.play')}</button>
          <button type="button" disabled={total < 1 || replay.live} onClick={replay.goLive} className={btn + ' disabled:opacity-50'}>{t('dtwin.replay.live')}</button>
          <label className="flex min-w-[200px] flex-1 items-center gap-3 text-sm font-semibold">
            <span className="sr-only">{t('dtwin.replay.slider')}</span>
            <input type="range" min="0" max={Math.max(0, total - 1)} value={replay.shown} disabled={total < 2} onChange={(e) => replay.seek(e.target.value)} className="h-11 w-full accent-ht-accent"
              aria-valuetext={t('dtwin.replay.status', { n: replay.shown + 1, total })} />
          </label>
          <p role="status" className="num text-sm text-ht-muted">{total ? (replay.live ? t('dtwin.replay.liveNow') : t('dtwin.replay.status', { n: replay.shown + 1, total })) : ''}</p>
        </div>
      </Panel>
    </div>
  );
}
