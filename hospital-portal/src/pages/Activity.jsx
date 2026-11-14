// Staff activity log (C4): what happened on which case, newest first, filterable. Built from the cases already loaded.
// Admins also see the server audit log (GET /audit) when the backend has one.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import checklists from '../data/checklists.json';
import * as api from '../services/api.js';
import { useAuth } from '../components/AuthProvider.jsx';
import { useHistory } from '../components/HistoryProvider.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { useT, useLang } from '../i18n/index.js';
import { typeText, formatWhen, activityText } from '../i18n/phrases.js';
import { buildActivity, filterActivity, auditRows, auditError, KINDS, WHO } from '../services/activity.js';

const field = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg';
function AuditLog() {
  const t = useT();
  const lang = useLang();
  const when = (iso) => formatWhen(iso, lang);
  const [state, setState] = useState({ status: 'loading', rows: [], error: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      setState({ status: 'ok', rows: auditRows(await api.getAudit()), error: null });
    } catch (err) {
      setState({ status: 'error', rows: [], error: auditError(err) });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <section data-testid="audit-section" aria-label={t('aud.title')} className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{t('aud.title')}</h2>
        <span className="rounded-full border border-slate-400 px-2.5 py-0.5 text-sm font-semibold text-slate-700">{t('aud.admin')}</span>
        <button data-testid="audit-refresh" onClick={load} className="ml-auto rounded-lg border-2 border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50">{t('common.refresh')}</button>
      </div>
      {state.status === 'loading' && <p data-testid="audit-loading">{t('common.loading')}</p>}
      {state.status === 'error' && <p data-testid="audit-message" data-kind={state.error.kind} role={state.error.kind === 'missing' ? 'status' : 'alert'} className="rounded-lg bg-slate-100 p-3 text-lg font-semibold">{state.error.text}</p>}
      {state.status === 'ok' && state.rows.length === 0 && <p data-testid="audit-message" className="text-lg text-slate-600">{t('aud.empty')}</p>}
      {state.status === 'ok' && state.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table data-testid="audit-table" className="w-full text-left text-base">
            <thead><tr className="border-b-2 border-slate-300"><th className="p-2">{t('aud.time')}</th><th className="p-2">{t('aud.user')}</th><th className="p-2">{t('aud.action')}</th><th className="p-2">{t('aud.patient')}</th><th className="p-2">{t('aud.outcome')}</th><th className="p-2">{t('aud.fields')}</th></tr></thead>
            <tbody>
              {state.rows.map((r) => (
                <tr key={r.id} data-outcome={r.outcome} className="border-b border-slate-200">
                  <td className="p-2">{r.time ? when(r.time) : '–'}</td>
                  <td className="p-2">{r.user ?? '–'} <span className="text-sm text-slate-500">{r.role}</span></td>
                  <td className="p-2 font-semibold">{r.action}</td>
                  <td className="p-2">{r.patient ?? '–'}</td>
                  <td className="p-2 font-semibold">{r.outcome === 'denied' ? `${t('aud.denied')}${r.reason ? ` (${r.reason})` : ''}` : r.outcome ?? '–'}</td>
                  <td className="p-2">{r.fields.length ? r.fields.join(', ') : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-slate-600">{t('aud.note')}</p>
    </section>
  );
}

export default function Activity() {
  const t = useT();
  const lang = useLang();
  const when = (iso) => formatWhen(iso, lang);
  const { role } = useAuth();
  const { cases, loading, error } = useHistory();
  const [f, setF] = useState({ kind: 'all', who: 'all', text: '' });
  const set = (k) => (e) => setF((old) => ({ ...old, [k]: e.target.value }));
  const all = useMemo(() => buildActivity(cases, checklists), [cases]);
  const rows = useMemo(() => filterActivity(all, f), [all, f]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{t('activity.title')}</h1>
        <SimulatedBadge text={t('hist.badge')} />
        <span data-testid="activity-count" className="ml-auto text-xl font-semibold">{t('act.count', { n: rows.length, total: all.length })}</span>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}

      <div className="grid gap-3 rounded-2xl bg-white p-4 shadow md:grid-cols-3">
        <label className="block"><span className="text-sm text-slate-600">{t('act.kind')}</span>
          <select data-testid="activity-kind" className={`${field} w-full`} value={f.kind} onChange={set('kind')}>{KINDS.map((k) => <option key={k} value={k}>{t(`act.k.${k}`)}</option>)}</select></label>
        <label className="block"><span className="text-sm text-slate-600">{t('act.who')}</span>
          <select data-testid="activity-who" className={`${field} w-full`} value={f.who} onChange={set('who')}>{WHO.map((k) => <option key={k} value={k}>{t(`act.w.${k}`)}</option>)}</select></label>
        <label className="block"><span className="text-sm text-slate-600">{t('act.search')}</span>
          <input data-testid="activity-search" className={`${field} w-full`} value={f.text} onChange={set('text')} /></label>
      </div>

      {loading && <p>{t('common.loading')}</p>}
      {!loading && rows.length === 0 && <p data-testid="activity-empty" className="rounded-xl bg-white p-6 text-xl shadow">{t('act.empty')}</p>}
      {rows.length > 0 && (
        <ol data-testid="activity-list" aria-label={t('act.listLabel')} className="divide-y divide-slate-200 rounded-2xl bg-white shadow">
          {rows.map((x) => (
            <li key={x.id} data-kind={x.kind} data-who={x.who} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-3">
              <time dateTime={x.ts} className="w-44 shrink-0 font-semibold tabular-nums text-slate-700">{when(x.ts)}</time>
              <Link to={`/report/${x.emergency_id}?t=${encodeURIComponent(x.case_key.split('|')[1] || '')}`} className="font-bold text-sky-800 underline">{x.emergency_id}</Link>
              <span className="text-sm text-slate-500">{x.type ? typeText(t, x.type) : x.type_label}</span>
              <span data-testid="activity-text" className="text-lg">{activityText(t, x)}</span>
              <span className="ml-auto text-slate-600">{x.actor || t('act.system')} <span className="text-sm">({t(`act.w.${x.who}`)})</span></span>
              {x.local_only && <span className="text-sm font-semibold text-amber-800">{t('act.localOnly')}</span>}
            </li>
          ))}
        </ol>
      )}

      {role === 'admin' && <AuditLog />}
    </div>
  );
}
