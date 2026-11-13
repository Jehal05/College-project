// Post-event report (feature #31): one printable page for a finished case, also read-only detail.
import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useHistory } from '../components/HistoryProvider.jsx';
import { useHospitals } from '../components/HospitalProvider.jsx';
import { useAmbulances } from '../components/AmbulanceProvider.jsx';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import checklists from '../data/checklists.json';
import rankingConfig from '../data/ranking-config.json';
import { buildReport, reportToText, formatSeconds } from '../services/report.js';
import { SEVERITY_STYLES } from '../services/contract.js';

const when = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function Report() {
  const { emergencyId } = useParams();
  const [query] = useSearchParams();
  const { cases, loading } = useHistory();
  const { hospitals } = useHospitals();
  const { ambulances } = useAmbulances();
  const { refresh } = useEmergencies();
  const wanted = query.get('t');
  const found = cases.find((c) => c.emergency_id === emergencyId && (!wanted || c.created_at === wanted)) || cases.find((c) => c.emergency_id === emergencyId);

  // Real backend: the list has no timeline, so ask for the full details once.
  useEffect(() => {
    if (found && (found.status_events || []).length <= 1) refresh(emergencyId);
  }, [emergencyId, Boolean(found)]);

  const report = useMemo(() => (found ? buildReport(found, { hospitals, rankingConfig, checklists, ambulances }) : null), [found, hospitals, ambulances]);

  function download() {
    const blob = new Blob([reportToText(report)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `post-event-report-${report.emergency_id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!report) {
    return (
      <div className="p-6">
        <p data-testid="report-missing" className="rounded-xl bg-white p-6 text-xl shadow">{loading ? 'Loading…' : `Case ${emergencyId} was not found.`}</p>
        <Link to="/history" className="mt-4 inline-block font-semibold text-sky-700 underline">Back to case history</Link>
      </div>
    );
  }
  const r = report;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link to="/history" className="font-semibold text-sky-700 underline">← Case history</Link>
        <button data-testid="report-print" onClick={() => window.print()} className="ml-auto rounded-lg bg-sky-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-sky-700">Print</button>
        <button data-testid="report-download" onClick={download} className="rounded-lg bg-slate-800 px-5 py-2.5 text-lg font-bold text-white hover:bg-slate-900">Download (.txt)</button>
      </div>

      <article data-testid="report" data-id={r.emergency_id} className="report space-y-5 rounded-2xl bg-white p-8 shadow">
        <header className="border-b-2 border-slate-300 pb-3">
          <h1 className="text-3xl font-bold">Post-event report · {r.emergency_id}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
            <SimulatedBadge text="Simulated prototype" />
            <span>Sample content, pending medical review. Not a medical record.{r.sample ? ' This is a sample past case.' : ''}</span>
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-lg md:grid-cols-3">
          <div><dt className="text-sm text-slate-500">Patient ID (sample)</dt><dd className="font-semibold">{r.patient_id}</dd></div>
          <div><dt className="text-sm text-slate-500">Type</dt><dd className="font-semibold">{r.type_label}</dd></div>
          <div><dt className="text-sm text-slate-500">Severity</dt><dd><span className={`rounded-full px-3 py-0.5 font-bold ${SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.NONE}`}>{r.severity}</span></dd></div>
          <div><dt className="text-sm text-slate-500">Alert time</dt><dd className="font-semibold">{new Date(r.created_at).toLocaleString()}</dd></div>
          <div className="col-span-2"><dt className="text-sm text-slate-500">Outcome</dt><dd data-testid="report-outcome" className="font-semibold">{r.outcome}</dd></div>
        </dl>

        <section>
          <h2 className="mb-1 text-xl font-bold">Hospital</h2>
          {r.hospital ? (
            <div data-testid="report-hospital" className="text-lg">
              <p><b>{r.hospital.name}</b> <span className="text-slate-600">({r.hospital.role})</span></p>
              <p data-testid="report-why">Why: {r.hospital.position ? `ranked ${r.hospital.position} of ${r.hospital.of} (score ${r.hospital.total}). ` : ''}{r.hospital.why}</p>
              <p className="text-sm text-slate-500">The reason is worked out again from the current hospital data (simulated).</p>
            </div>
          ) : <p className="text-lg text-slate-600">No hospital recorded.</p>}
          <p className="mt-1 text-lg">Escalations to the next hospital: <b data-testid="report-escalations">{r.escalations}</b></p>
        </section>

        <section className="grid gap-4 text-lg md:grid-cols-2">
          <div><h2 className="mb-1 text-xl font-bold">Ambulance</h2>
            <p data-testid="report-ambulance">{r.ambulance ? <><b>{r.ambulance.call_sign}</b> ({r.ambulance.id}){r.ambulance.crew ? <span className="block text-base text-slate-600">Crew: {r.ambulance.crew.driver}, {r.ambulance.crew.paramedic}</span> : null}{r.corridor_requested && <span className="block text-base text-slate-600">Green corridor requested (simulated)</span>}</> : 'None sent'}</p></div>
          <div><h2 className="mb-1 text-xl font-bold">Assigned team</h2>
            <p data-testid="report-team">{r.team ? <><b>{r.team.name}</b> ({r.team.specialty})</> : 'None assigned'}</p></div>
        </section>

        <section>
          <h2 className="mb-1 text-xl font-bold">Step durations</h2>
          <table data-testid="report-durations" className="w-full text-lg"><tbody>
            {r.durations.map((d) => <tr key={d.key} data-key={d.key} className="border-t border-slate-200"><td className="py-1">{d.label}</td><td className="py-1 text-right font-semibold">{formatSeconds(d.seconds)}</td></tr>)}
          </tbody></table>
        </section>

        <section>
          <h2 className="mb-1 text-xl font-bold">Timeline</h2>
          <ol data-testid="report-timeline" className="space-y-1 text-lg">
            {r.timeline.map((t, i) => (
              <li key={i} className="flex gap-3 border-t border-slate-200 py-1">
                <span className="w-28 shrink-0 tabular-nums text-slate-600">{when(t.timestamp)}</span>
                <span className="w-16 shrink-0 tabular-nums text-slate-500">+{t.offset_seconds} s</span>
                <span><b>{t.label}</b>{t.actor ? <span className="text-slate-600"> · {t.actor}</span> : null}{t.note ? <span className="text-slate-600"> · {t.note}</span> : null}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-1 text-xl font-bold">Pre-arrival checklist</h2>
          <p data-testid="report-checklist" className="text-lg font-semibold">{r.checklist.done} of {r.checklist.total} done</p>
          <ul className="text-lg">{r.checklist.items.map((i) => <li key={i.id}>{i.done ? '☑' : '☐'} {i.text}</li>)}</ul>
          <p className="text-sm text-slate-500">Sample checklist. Pending medical review.</p>
        </section>

        <section data-testid="report-handover">
          <h2 className="mb-1 text-xl font-bold">Shift handover</h2>
          {r.handover.length === 0 ? <p className="text-lg text-slate-600">No handover note.</p> : (
            <ul className="text-lg">{r.handover.map((n, i) => <li key={i}>{when(n.timestamp)} · {n.text}{n.actor ? ` (${n.actor})` : ''}{n.localOnly ? ' [saved on this screen only]' : ''}</li>)}</ul>
          )}
          {r.desk_notes.length > 0 && (
            <>
              <h3 className="mb-1 mt-3 text-lg font-bold">Desk notes</h3>
              <ul data-testid="report-desk-notes" className="text-lg">{r.desk_notes.map((n, i) => <li key={i}>{when(n.timestamp)} · {n.text}{n.actor ? ` (${n.actor})` : ''}{n.localOnly ? ' [saved on this screen only]' : ''}</li>)}</ul>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-1 text-xl font-bold">Notes</h2>
          {r.notes.length === 0 ? <p className="text-lg text-slate-600">No notes.</p> : (
            <ul data-testid="report-notes" className="text-lg">{r.notes.map((n, i) => <li key={i}>{when(n.timestamp)} · {n.text}{n.actor ? ` (${n.actor})` : ''}</li>)}</ul>
          )}
        </section>
      </article>
    </div>
  );
}
