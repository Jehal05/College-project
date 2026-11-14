// Shift-handover summary: all handover notes of the open cases on one printable sheet.
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import { useHospitals } from '../components/HospitalProvider.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { useT } from '../i18n/index.js';
import { stateText, severityText } from '../i18n/phrases.js';
import { handoverSheet, needsDetails } from '../services/handoverSheet.js';
import { getScope, subscribeUi } from '../services/uiStore.js';
import { SEVERITY_STYLES } from '../services/contract.js';

const time = (iso) => new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function Handover() {
  const t = useT();
  const { visibleEmergencies, refresh } = useEmergencies();
  const { hospitals } = useHospitals();
  const scope = useSyncExternalStore(subscribeUi, getScope);
  const sheet = useMemo(() => handoverSheet(visibleEmergencies, (id) => hospitals.find((h) => h.id === id)?.name || id), [visibleEmergencies, hospitals]);
  const asked = useRef(new Set());

  // With a real backend the queue list carries no timeline: ask for each open case's details once, so its notes show.
  const wanted = visibleEmergencies.filter((e) => needsDetails(e)).map((e) => e.emergency_id).join('|');
  useEffect(() => {
    for (const id of wanted ? wanted.split('|') : []) {
      if (asked.current.has(id)) continue;
      asked.current.add(id);
      refresh(id);
    }
  }, [wanted, refresh]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{t('handover.title')}</h1>
        <SimulatedBadge text={t('handover.badge')} />
        <button data-testid="handover-print" onClick={() => window.print()} className="no-print ml-auto rounded-lg bg-sky-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-sky-700">{t('handover.print')}</button>
      </div>
      <p className="text-slate-600">{t('handover.intro', { time: time(new Date().toISOString()), scope: scope === 'mine' ? t('handover.scopeMine') : t('handover.scopeAll') })}</p>
      <p data-testid="handover-summary" className="text-lg font-semibold">{t('handover.summary', { cases: sheet.cases.length, withNotes: sheet.withNotes, notes: sheet.noteCount })}</p>

      {sheet.cases.length === 0 && <p data-testid="handover-empty" className="rounded-xl bg-white p-6 text-xl shadow">{t('handover.empty')}</p>}

      <ol className="space-y-4">
        {sheet.cases.map((c) => (
          <li key={c.emergency_id} data-testid="handover-case" data-id={c.emergency_id} className="report break-inside-avoid rounded-2xl border-2 border-slate-300 bg-white p-4 shadow">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <b className="text-xl">{c.emergency_id}</b>
              <span>{c.type_label}</span>
              {c.severity && <span className={`rounded-full px-3 py-0.5 text-base font-bold ${SEVERITY_STYLES[c.severity] || SEVERITY_STYLES.NONE}`}>{severityText(t, c.severity)}</span>}
              <span>{t('handover.patient', { id: c.patient_id ?? t('handover.notShared') })}</span>
              <span className="text-slate-600">{stateText(t, c.state).split(' · ')[0]}</span>
              {c.hospital && <span className="text-slate-600">{t('handover.at', { hospital: c.hospital })}</span>}
            </div>
            {c.notes.length === 0 ? (
              <p data-testid="handover-nonote" className="mt-2 text-slate-500">{t('handover.noNote')}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {c.notes.map((n, i) => (
                  <li key={n.note_id || i} data-testid="handover-note" className="text-lg">
                    <span className="font-semibold tabular-nums text-slate-700">{time(n.timestamp)}</span> {n.text}
                    {n.actor && <span className="text-slate-600"> ({t('handover.by', { name: n.actor })})</span>}
                    {n.localOnly && <span className="text-sm font-semibold text-amber-800"> · {t('handover.localOnly')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p className="hidden pt-6 text-lg print:block">{t('handover.sign')}</p>
    </div>
  );
}
