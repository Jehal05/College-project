// Case history (feature #48): search and filter past emergencies, open the read-only report.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHistory } from '../components/HistoryProvider.jsx';
import { useHospitals } from '../components/HospitalProvider.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { filterCases } from '../services/cases.js';
import { USE_MOCK } from '../services/config.js';
import { savedCount, clearSaved } from '../services/historyStore.js';
import { MAX_SAVED } from '../services/historyCap.js';
import { stepDurations } from '../services/analytics.js';
import { casesToCsv } from '../services/csv.js';
import { downloadText } from '../services/download.js';
import { isFinal } from '../services/stateMachine.js';
import { formatSeconds } from '../services/report.js';
import { EMERGENCY_TYPES, SEVERITY, TYPE_LABELS, SEVERITY_STYLES } from '../services/contract.js';
import { useT } from '../i18n/index.js';
import { stateText, severityText } from '../i18n/phrases.js';

const field = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg';

export default function History() {
  const t = useT();
  const { cases, loading, error, reload } = useHistory();
  const [asking, setAsking] = useState(false);
  const saved = savedCount();
  const { hospitals } = useHospitals();
  const [f, setF] = useState({ text: '', type: '', severity: '', state: 'finished', from: '', to: '', hospital: '' });
  const set = (k) => (e) => setF((old) => ({ ...old, [k]: e.target.value }));
  const rows = useMemo(() => filterCases(cases, f, hospitals), [cases, f, hospitals]);
  const hospitalName = (id) => hospitals.find((h) => h.id === id)?.name || id || '–';
  const filtered = Object.entries(f).some(([k, v]) => v && !(k === 'state' && v === 'finished'));

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{t('hist.title')}</h1>
        <SimulatedBadge text={t('hist.badge')} />
        <span data-testid="history-count" className="ml-auto text-xl font-semibold">{t('hist.count', { n: rows.length, total: cases.length })}</span>
        <button data-testid="history-csv" disabled={rows.length === 0} title={t('hist.csvNote', { n: rows.length })} onClick={() => downloadText(`case-history-${new Date().toISOString().slice(0, 10)}.csv`, casesToCsv(rows, hospitalName), 'text/csv;charset=utf-8')} className="rounded-lg bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-900 disabled:opacity-50">{t('hist.csv')}</button>
      </div>
      {USE_MOCK && (
        <div data-testid="history-saved" className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow">
          <span className="text-slate-700">{t('hist.savedNote', { n: saved, max: MAX_SAVED })}</span>
          {!asking && <button data-testid="history-clear-saved" disabled={saved === 0} onClick={() => setAsking(true)} className="rounded-lg border-2 border-slate-300 px-3 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-50">{t('hist.clearSaved')}</button>}
          {asking && (
            <span data-testid="history-clear-confirm" className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-100 px-3 py-1">
              {t('hist.clearAsk', { n: saved })}
              <button data-testid="history-clear-yes" onClick={() => { clearSaved(); setAsking(false); reload(); }} className="rounded bg-red-600 px-3 py-1 font-bold text-white">{t('hist.clearYes')}</button>
              <button data-testid="history-clear-no" onClick={() => setAsking(false)} className="rounded bg-slate-300 px-3 py-1 font-semibold">{t('hist.clearNo')}</button>
            </span>
          )}
        </div>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}

      <div className="grid gap-3 rounded-2xl bg-white p-4 shadow md:grid-cols-2 xl:grid-cols-4">
        <label className="block md:col-span-2"><span className="text-sm text-slate-600">{t('hist.search')}</span>
          <input data-testid="history-search" className={`${field} w-full`} value={f.text} onChange={set('text')} placeholder={t('hist.ph')} /></label>
        <label className="block"><span className="text-sm text-slate-600">{t('hist.type')}</span>
          <select data-testid="history-type" className={`${field} w-full`} value={f.type} onChange={set('type')}>
            <option value="">{t('hist.allTypes')}</option>{EMERGENCY_TYPES.map((ty) => <option key={ty} value={ty}>{TYPE_LABELS[ty]}</option>)}</select></label>
        <label className="block"><span className="text-sm text-slate-600">{t('hist.severity')}</span>
          <select data-testid="history-severity" className={`${field} w-full`} value={f.severity} onChange={set('severity')}>
            <option value="">{t('hist.allSev')}</option>{SEVERITY.filter((x) => x !== 'NONE').map((x) => <option key={x} value={x}>{severityText(t, x)}</option>)}</select></label>
        <label className="block"><span className="text-sm text-slate-600">{t('hist.state')}</span>
          <select data-testid="history-state" className={`${field} w-full`} value={f.state} onChange={set('state')}>
            <option value="finished">{t('hist.s.finished')}</option><option value="HANDOVER_DONE">{t('hist.s.done')}</option><option value="CANCELLED">{t('hist.s.cancelled')}</option>
            <option value="open">{t('hist.s.open')}</option><option value="all">{t('hist.s.all')}</option></select></label>
        <label className="block"><span className="text-sm text-slate-600">{t('hist.hospital')}</span>
          <select data-testid="history-hospital" className={`${field} w-full`} value={f.hospital} onChange={set('hospital')}>
            <option value="">{t('hist.allHosp')}</option>{hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        <label className="block"><span className="text-sm text-slate-600">{t('hist.from')}</span>
          <input data-testid="history-from" type="date" className={`${field} w-full`} value={f.from} onChange={set('from')} /></label>
        <label className="block"><span className="text-sm text-slate-600">{t('hist.to')}</span>
          <input data-testid="history-to" type="date" className={`${field} w-full`} value={f.to} onChange={set('to')} /></label>
        {filtered && (
          <button data-testid="history-clear" onClick={() => setF({ text: '', type: '', severity: '', state: 'finished', from: '', to: '', hospital: '' })} className="self-end rounded-lg bg-slate-200 px-4 py-2 text-lg font-semibold">{t('hist.clear')}</button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full text-left text-lg">
          <thead className="bg-slate-100 text-sm uppercase tracking-wide text-slate-600">
            <tr><th className="px-4 py-3">{t('hist.c.case')}</th><th className="px-4 py-3">{t('hist.c.time')}</th><th className="px-4 py-3">{t('hist.type')}</th><th className="px-4 py-3">{t('hist.severity')}</th><th className="px-4 py-3">{t('hist.hospital')}</th><th className="px-4 py-3">{t('hist.c.result')}</th><th className="px-4 py-3">{t('hist.c.total')}</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={`${e.emergency_id}|${e.created_at}`} data-testid="history-row" data-id={e.emergency_id} data-state={e.state} className="border-t border-slate-200">
                <td className="px-4 py-3"><b>{e.emergency_id}</b><span className="block text-sm text-slate-500">{t('hist.patientSample', { id: e.patient_id })}{e.sample ? t('hist.sampleCase') : ''}</span></td>
                <td className="px-4 py-3 text-base">{new Date(e.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className="px-4 py-3">{TYPE_LABELS[e.type] || e.type}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-base font-bold ${SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.NONE}`}>{severityText(t, e.severity)}</span></td>
                <td className="px-4 py-3 text-base">{hospitalName(e.alerted_hospital_id)}</td>
                <td className="px-4 py-3">{stateText(t, e.state)}</td>
                <td className="px-4 py-3">{formatSeconds(stepDurations(e).total).replace('Not reached', '–')}</td>
                <td className="px-4 py-3"><Link data-testid="open-report" to={`/report/${e.emergency_id}?t=${encodeURIComponent(e.created_at)}`} className="rounded-lg bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-700">{t('hist.open')}</Link></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td data-testid="history-empty" colSpan={8} className="px-4 py-8 text-xl text-slate-500">{loading ? t('common.loading') : f.state === 'finished' && !cases.some((c) => isFinal(c.state)) ? t('hist.notEnough') : t('hist.noMatch')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
