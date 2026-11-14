// Post-event report (feature #31): one printable page for a finished case, also read-only detail.
import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useHistory } from '../components/HistoryProvider.jsx';
import { useHospitals } from '../components/HospitalProvider.jsx';
import { useAmbulances } from '../components/AmbulanceProvider.jsx';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import { downloadText } from '../services/download.js';
import { timelineToCsv } from '../services/csv.js';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import checklists from '../data/checklists.json';
import rankingConfig from '../data/ranking-config.json';
import { buildReport, reportToText } from '../services/report.js';
import { SEVERITY_STYLES } from '../services/contract.js';
import { useT, useLang } from '../i18n/index.js';
import { typeText, severityText, stateText, ruledOutText, durationText } from '../i18n/phrases.js';

const LOCALES = { hi: 'hi-IN', gu: 'gu-IN' };

export default function Report() {
  const t = useT();
  const lang = useLang();
  const when = (ts) => new Date(ts).toLocaleTimeString(LOCALES[lang] || [], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const seconds = (sec) => (sec === null || sec === undefined ? t('rp.notReached') : durationText(t, sec));
  const { emergencyId } = useParams();
  const [query] = useSearchParams();
  const { cases, loading } = useHistory();
  const { hospitals } = useHospitals();
  const { ambulances } = useAmbulances();
  const { refresh } = useEmergencies();
  const wanted = query.get('t');
  const found = cases.find((c) => c.emergency_id === emergencyId && (!wanted || c.created_at === wanted)) || cases.find((c) => c.emergency_id === emergencyId);

  // Real backend: the list has no timeline, so ask for the full details once.
  const needsDetails = Boolean(found) && (found.status_events || []).length <= 1;
  useEffect(() => {
    if (needsDetails) refresh(emergencyId);
  }, [needsDetails, emergencyId, refresh]);

  const report = useMemo(() => (found ? buildReport(found, { hospitals, rankingConfig, checklists, ambulances }) : null), [found, hospitals, ambulances]);

  const download = () => downloadText(`post-event-report-${report.emergency_id}.txt`, reportToText(report));
  const downloadCsv = () => downloadText(`post-event-timeline-${report.emergency_id}.csv`, timelineToCsv(found.status_events), 'text/csv;charset=utf-8');

  if (!report) {
    return (
      <div className="p-6">
        <p data-testid="report-missing" className="rounded-xl bg-white p-6 text-xl shadow">{loading ? t('common.loading') : t('rp.notFound', { id: emergencyId })}</p>
        <Link to="/history" className="mt-4 inline-block font-semibold text-sky-700 underline">{t('rp.back')}</Link>
      </div>
    );
  }
  const r = report;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link to="/history" className="font-semibold text-sky-700 underline">← {t('hist.title')}</Link>
        <button data-testid="report-print" onClick={() => window.print()} className="ml-auto rounded-lg bg-sky-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-sky-700">{t('handover.print')}</button>
        <button data-testid="report-download" onClick={download} className="rounded-lg bg-slate-800 px-5 py-2.5 text-lg font-bold text-white hover:bg-slate-900">{t('rp.dlTxt')}</button>
        <button data-testid="report-csv" onClick={downloadCsv} className="rounded-lg bg-slate-800 px-5 py-2.5 text-lg font-bold text-white hover:bg-slate-900">{t('rp.dlCsv')}</button>
      </div>

      <article data-testid="report" data-id={r.emergency_id} className="report space-y-5 rounded-2xl bg-white p-8 shadow">
        <header className="border-b-2 border-slate-300 pb-3">
          <h1 className="text-3xl font-bold">{t('rp.title')} · {r.emergency_id}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
            <SimulatedBadge text={t('app.simulated')} />
            <span>{t('rp.sample')}{r.sample ? t('rp.sampleCase') : ''}</span>
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-lg md:grid-cols-3">
          <div><dt className="text-sm text-slate-500">{t('rp.patientId')}</dt><dd className="font-semibold">{r.patient_id}</dd></div>
          <div><dt className="text-sm text-slate-500">{t('rp.type')}</dt><dd className="font-semibold">{typeText(t, r.type)}</dd></div>
          <div><dt className="text-sm text-slate-500">{t('hist.severity')}</dt><dd><span className={`rounded-full px-3 py-0.5 font-bold ${SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.NONE}`}>{severityText(t, r.severity)}</span></dd></div>
          <div><dt className="text-sm text-slate-500">{t('rp.alertTime')}</dt><dd className="font-semibold">{new Date(r.created_at).toLocaleString(LOCALES[lang] || [])}</dd></div>
          <div className="col-span-2"><dt className="text-sm text-slate-500">{t('rp.outcome')}</dt><dd data-testid="report-outcome" className="font-semibold">{t(`rp.o.${r.outcome_key}`)}</dd></div>
        </dl>

        <section>
          <h2 className="mb-1 text-xl font-bold">{t('map.l.hospital')}</h2>
          {r.hospital ? (
            <div data-testid="report-hospital" className="text-lg">
              <p><b>{r.hospital.name}</b> <span className="text-slate-600">({t(`rp.h.${r.hospital.role_key}`)})</span></p>
              <p data-testid="report-why">{t('rk.why')} {r.hospital.position ? t('rp.ranked', { pos: r.hospital.position, of: r.hospital.of, total: r.hospital.total }) : ''}{r.hospital.position ? r.hospital.why : ruledOutText(t, r.hospital.why)}</p>
              <p className="text-sm text-slate-500">{t('rp.reasonNote')}</p>
            </div>
          ) : <p className="text-lg text-slate-600">{t('rp.noHospital')}</p>}
          <p className="mt-1 text-lg">{t('rp.escalations')} <b data-testid="report-escalations">{r.escalations}</b></p>
        </section>

        <section className="grid gap-4 text-lg md:grid-cols-2">
          <div><h2 className="mb-1 text-xl font-bold">{t('act.w.ambulance')}</h2>
            <p data-testid="report-ambulance">{r.ambulance ? <><b>{r.ambulance.call_sign}</b> ({r.ambulance.id}){r.ambulance.crew ? <span className="block text-base text-slate-600">{t('dispatch.crew')} {r.ambulance.crew.driver}, {r.ambulance.crew.paramedic}</span> : null}{r.corridor_requested && <span className="block text-base text-slate-600">{t('rp.corridor')}</span>}</> : t('rp.noneSent')}</p></div>
          <div><h2 className="mb-1 text-xl font-bold">{t('rp.team')}</h2>
            <p data-testid="report-team">{r.team ? <><b>{r.team.name}</b> ({r.team.specialty})</> : t('rp.noneAssigned')}</p></div>
        </section>

        <section>
          <h2 className="mb-1 text-xl font-bold">{t('rp.durations')}</h2>
          <table data-testid="report-durations" className="w-full text-lg"><tbody>
            {r.durations.map((d) => <tr key={d.key} data-key={d.key} className="border-t border-slate-200"><td className="py-1">{d.key === 'total' ? (r.state === 'CANCELLED' ? t('rp.totalCancelled') : t('rp.total')) : t(`an.step.${d.key}`)}</td><td className="py-1 text-right font-semibold">{seconds(d.seconds)}</td></tr>)}
          </tbody></table>
        </section>

        <section>
          <h2 className="mb-1 text-xl font-bold">{t('rp.timeline')}</h2>
          <ol data-testid="report-timeline" className="space-y-1 text-lg">
            {r.timeline.map((ev, i) => (
              <li key={i} className="flex gap-3 border-t border-slate-200 py-1">
                <span className="w-28 shrink-0 tabular-nums text-slate-600">{when(ev.timestamp)}</span>
                <span className="w-16 shrink-0 tabular-nums text-slate-500">+{t('dur.sec', { s: ev.offset_seconds })}</span>
                <span><b>{ev.state === 'NOTE' ? ev.label : stateText(t, ev.state)}</b>{ev.actor ? <span className="text-slate-600"> · {ev.actor}</span> : null}{ev.note ? <span className="text-slate-600"> · {ev.note}</span> : null}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-1 text-xl font-bold">{t('sec.checklist')}</h2>
          <p data-testid="report-checklist" className="text-lg font-semibold">{t('rd.checklistDone', { done: r.checklist.done, total: r.checklist.total })}</p>
          <ul className="text-lg">{r.checklist.items.map((i) => <li key={i.id}>{i.done ? '☑' : '☐'} {i.text}</li>)}</ul>
          <p className="text-sm text-slate-500">{t('rp.sampleChecklist')}</p>
        </section>

        <section data-testid="report-handover">
          <h2 className="mb-1 text-xl font-bold">{t('handover.title')}</h2>
          {r.handover.length === 0 ? <p className="text-lg text-slate-600">{t('rp.noHandover')}</p> : (
            <ul className="text-lg">{r.handover.map((n, i) => <li key={i}>{when(n.timestamp)} · {n.text}{n.actor ? ` (${n.actor})` : ''}{n.localOnly ? ` ${t('notes.localOnly')}` : ''}</li>)}</ul>
          )}
          {r.desk_notes.length > 0 && (
            <>
              <h3 className="mb-1 mt-3 text-lg font-bold">{t('rp.deskNotes')}</h3>
              <ul data-testid="report-desk-notes" className="text-lg">{r.desk_notes.map((n, i) => <li key={i}>{when(n.timestamp)} · {n.text}{n.actor ? ` (${n.actor})` : ''}{n.localOnly ? ` ${t('notes.localOnly')}` : ''}</li>)}</ul>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-1 text-xl font-bold">{t('rp.notes')}</h2>
          {r.notes.length === 0 ? <p className="text-lg text-slate-600">{t('rp.noNotes')}</p> : (
            <ul data-testid="report-notes" className="text-lg">{r.notes.map((n, i) => <li key={i}>{when(n.timestamp)} · {n.text}{n.actor ? ` (${n.actor})` : ''}</li>)}</ul>
          )}
        </section>
      </article>
    </div>
  );
}
