// Case history (feature #48): search and filter past emergencies, open the read-only report.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHistory } from '../components/HistoryProvider.jsx';
import { useHospitals } from '../components/HospitalProvider.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { filterCases } from '../services/cases.js';
import { stepDurations } from '../services/analytics.js';
import { isFinal } from '../services/stateMachine.js';
import { formatSeconds } from '../services/report.js';
import { EMERGENCY_TYPES, SEVERITY, TYPE_LABELS, SEVERITY_STYLES, STATE_LABELS } from '../services/contract.js';

const field = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg';

export default function History() {
  const { cases, loading, error } = useHistory();
  const { hospitals } = useHospitals();
  const [f, setF] = useState({ text: '', type: '', severity: '', state: 'finished', from: '', to: '', hospital: '' });
  const set = (k) => (e) => setF((old) => ({ ...old, [k]: e.target.value }));
  const rows = useMemo(() => filterCases(cases, f, hospitals), [cases, f, hospitals]);
  const hospitalName = (id) => hospitals.find((h) => h.id === id)?.name || id || '–';
  const filtered = Object.entries(f).some(([k, v]) => v && !(k === 'state' && v === 'finished'));

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Case history</h1>
        <SimulatedBadge text="Simulated cases · sample patients" />
        <span data-testid="history-count" className="ml-auto text-xl font-semibold">{rows.length} of {cases.length} cases</span>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}

      <div className="grid gap-3 rounded-2xl bg-white p-4 shadow md:grid-cols-2 xl:grid-cols-4">
        <label className="block md:col-span-2"><span className="text-sm text-slate-600">Search (case ID, patient ID, hospital, symptom)</span>
          <input data-testid="history-search" className={`${field} w-full`} value={f.text} onChange={set('text')} placeholder="For example E-0901 or chest pain" /></label>
        <label className="block"><span className="text-sm text-slate-600">Type</span>
          <select data-testid="history-type" className={`${field} w-full`} value={f.type} onChange={set('type')}>
            <option value="">All types</option>{EMERGENCY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></label>
        <label className="block"><span className="text-sm text-slate-600">Severity</span>
          <select data-testid="history-severity" className={`${field} w-full`} value={f.severity} onChange={set('severity')}>
            <option value="">All severities</option>{SEVERITY.filter((x) => x !== 'NONE').map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block"><span className="text-sm text-slate-600">State</span>
          <select data-testid="history-state" className={`${field} w-full`} value={f.state} onChange={set('state')}>
            <option value="finished">Finished or cancelled</option><option value="HANDOVER_DONE">Handed over only</option><option value="CANCELLED">Cancelled only</option>
            <option value="open">Still open</option><option value="all">All</option></select></label>
        <label className="block"><span className="text-sm text-slate-600">Hospital</span>
          <select data-testid="history-hospital" className={`${field} w-full`} value={f.hospital} onChange={set('hospital')}>
            <option value="">All hospitals</option>{hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        <label className="block"><span className="text-sm text-slate-600">From date</span>
          <input data-testid="history-from" type="date" className={`${field} w-full`} value={f.from} onChange={set('from')} /></label>
        <label className="block"><span className="text-sm text-slate-600">To date</span>
          <input data-testid="history-to" type="date" className={`${field} w-full`} value={f.to} onChange={set('to')} /></label>
        {filtered && (
          <button data-testid="history-clear" onClick={() => setF({ text: '', type: '', severity: '', state: 'finished', from: '', to: '', hospital: '' })} className="self-end rounded-lg bg-slate-200 px-4 py-2 text-lg font-semibold">Clear filters</button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full text-left text-lg">
          <thead className="bg-slate-100 text-sm uppercase tracking-wide text-slate-600">
            <tr><th className="px-4 py-3">Case</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Hospital</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Total time</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={`${e.emergency_id}|${e.created_at}`} data-testid="history-row" data-id={e.emergency_id} data-state={e.state} className="border-t border-slate-200">
                <td className="px-4 py-3"><b>{e.emergency_id}</b><span className="block text-sm text-slate-500">{e.patient_id} (sample){e.sample ? ' · sample case' : ''}</span></td>
                <td className="px-4 py-3 text-base">{new Date(e.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td className="px-4 py-3">{TYPE_LABELS[e.type] || e.type}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-base font-bold ${SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.NONE}`}>{e.severity}</span></td>
                <td className="px-4 py-3 text-base">{hospitalName(e.alerted_hospital_id)}</td>
                <td className="px-4 py-3">{STATE_LABELS[e.state] || e.state}</td>
                <td className="px-4 py-3">{formatSeconds(stepDurations(e).total).replace('Not reached', '–')}</td>
                <td className="px-4 py-3"><Link data-testid="open-report" to={`/report/${e.emergency_id}?t=${encodeURIComponent(e.created_at)}`} className="rounded-lg bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-700">Open report</Link></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td data-testid="history-empty" colSpan={8} className="px-4 py-8 text-xl text-slate-500">{loading ? 'Loading…' : f.state === 'finished' && !cases.some((c) => isFinal(c.state)) ? 'Not enough data yet. No emergency has been finished.' : 'No case matches these filters.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
