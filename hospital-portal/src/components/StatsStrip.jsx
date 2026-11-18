// The four numbers at the top of the dashboard (Phase 6A step 3). The maths is in services/dashboardStats.js.
import { dashboardStats } from '../services/dashboardStats.js';
import Card from './ui/Card.jsx';
import SimulatedBadge from './SimulatedBadge.jsx';
import { useT } from '../i18n/index.js';

function Tile({ id, label, stat, note, t, emphasis }) {
  const has = stat.value !== null;
  const value = has ? String(stat.value) : t('stats.na');
  return (
    <Card as="div" data-testid={`stat-${id}`} data-value={has ? stat.value : ''} role="group" aria-label={t('stats.aria', { label, value })} className={`p-4 ${emphasis && has && stat.value > 0 ? 'border-2 border-red-600' : 'border-2 border-transparent'}`}>
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div data-testid="stat-value" className={`font-bold tabular-nums ${has ? 'text-4xl' : 'text-xl text-slate-500'}`}>{value}</div>
      <div className="mt-1 flex min-h-6 flex-wrap items-center gap-2 text-sm text-slate-500">
        {note}
        {stat.simulated && <SimulatedBadge className="!text-xs" />}
      </div>
    </Card>
  );
}

export default function StatsStrip({ emergencies, hospital, units, loaded }) {
  const t = useT();
  const s = dashboardStats(emergencies, { hospital, units, loaded });
  return (
    <section data-testid="stats-strip" aria-label={t('stats.title')} className="grid gap-3 border-b border-slate-300 bg-slate-50 px-6 py-3 sm:grid-cols-2 xl:grid-cols-5">
      <Tile id="active" label={t('stats.active')} stat={s.active} t={t} />
      <Tile id="oncall" label={t('stats.onCall')} stat={s.onCall} t={t} />
      <Tile id="beds" label={t('stats.beds')} stat={s.beds} note={s.beds.value === null ? t('stats.bedsNotShared') : t('stats.bedsNote')} t={t} />
      <Tile id="unacknowledged" label={t('stats.unack')} stat={s.unacknowledged} note={t('stats.unackNote')} t={t} emphasis />
      <Tile id="escalated" label={t('stats.escalated')} stat={s.escalated} note={t('stats.escalatedNote')} t={t} emphasis />
    </section>
  );
}
