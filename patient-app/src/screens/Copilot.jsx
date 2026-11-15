// Health Copilot: fixed questions, answers built by rules from your own data. Not an AI model, not advice, not a diagnosis.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useHealthData from '../hooks/useHealthData';
import useContacts from '../hooks/useContacts';
import useConsents from '../hooks/useConsents';
import useReminders from '../hooks/useReminders';
import { ORGANS } from '../config/organs';
import { metricStates } from '../utils/diseaseIntel';
import { completeness } from '../utils/overview';
import { QUESTIONS, answer } from '../utils/copilot';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import Icon from '../components/icons';

const ALL = { metrics: ORGANS.flatMap((o) => o.metrics).filter((m, i, a) => a.findIndex((x) => x.key === m.key) === i) };
const link = 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-ht-line px-4 text-sm font-semibold text-ht-accent hover:border-ht-accent';

export default function Copilot() {
  const { t } = useTranslation();
  const data = useHealthData();
  const { contacts } = useContacts(data.id);
  const { consents } = useConsents(data.id);
  const { list: reminders } = useReminders(data.id);
  const [asked, setAsked] = useState([]); // newest first, last 4

  const rows = metricStates(ALL, data).map((r) => ({ key: r.key, value: r.value, within: r.within }));
  const done = completeness({ patient: data.patient, contacts, reports: data.reports, baseline: data.baseline, reminders, vitals: data.vitals });
  const ctx = { rows, done, history: data.history, contacts, consents, reports: data.reports, labs: data.labs };
  const nm = (k) => t('twin.' + k);
  // params that are lists of i18n keys are translated here, so the text stays in the language files
  const fill = (p = {}) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v.map((x) => t(x)).join(', ') : k === 'item' ? t('overview.item.' + v) : k === 'key' ? nm(v) : v]));
  const ask = (q) => setAsked([{ q, id: Date.now() + Math.random() }, ...asked].slice(0, 4));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('nav.copilot')}</h1><p className="text-ht-muted">{t('cp.intro')}</p></div>
        <div className="flex flex-wrap gap-2"><DataSourceBadge source="simulated" /><StatusChip tone="info" icon="info">{t('cp.rules')}</StatusChip></div>
      </header>
      <p role="note" className="rounded-xl border border-ht-line bg-ht-card p-3 text-sm">{t('cp.notAi')}</p>
      <p className="flex flex-wrap items-center gap-3 rounded-xl border border-ht-emergency/60 bg-ht-emergency/10 p-3 text-sm font-semibold text-ht-emergencytext">
        <Icon name="alert" size={18} />{t('cp.urgent')} <Link to="/emergency-center" className="underline">{t('nav.emergency')}</Link>
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel aria-labelledby="cp-q">
          <h2 id="cp-q" className="mb-2 text-lg font-bold">{t('cp.pick')}</h2>
          <ul className="space-y-2">
            {QUESTIONS.map((q) => (
              <li key={q}><button type="button" onClick={() => ask(q)} className="min-h-[44px] w-full rounded-xl border border-ht-line bg-ht-bg px-3 py-2 text-left text-sm font-semibold hover:border-ht-accent">{t('cp.q.' + q)}</button></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ht-muted">{t('cp.noFreeText')}</p>
        </Panel>

        <Panel glow aria-labelledby="cp-a">
          <h2 id="cp-a" className="mb-2 text-lg font-bold">{t('cp.answers')}</h2>
          <div role="log" aria-live="polite" className="space-y-4">
            {asked.length === 0 && <p className="text-sm text-ht-muted">{t('cp.empty')}</p>}
            {asked.map(({ q, id }) => {
              const a = answer(q, ctx, nm);
              return (
                <article key={id} data-testid="cp-answer" className="rounded-xl border border-ht-line bg-ht-bg p-3 text-sm">
                  <p className="mb-2 font-bold">{t('cp.q.' + q)}</p>
                  <ul className="space-y-1">{a.lines.map((l, i) => <li key={i}>{t(l.k, fill(l.p))}</li>)}</ul>
                  <p className="mt-2 text-xs text-ht-muted">{t('cp.from', { sources: a.from.map((s) => t('cp.src.' + s)).join(', ') })}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {a.links.map((l) => <Link key={l.to} to={l.to} className={link}>{t(l.k)}</Link>)}
                    <StatusChip tone="neutral" icon="info">{t('cp.badge')}</StatusChip>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      </div>
      <p className="text-xs font-semibold text-ht-muted">{t('twin.notDiagnosis')}</p>
    </div>
  );
}
