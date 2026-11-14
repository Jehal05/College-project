// Pre-arrival readiness (C3): ETA, what the patient shared, checklist progress and team, plus an explicit "Open passport" button.
import { useState } from 'react';
import checklists from '../../data/checklists.json';
import * as api from '../../services/api.js';
import { readinessCard, passportRows, passportError } from '../../services/readiness.js';
import { useT } from '../../i18n/index.js';

const FACT_KEY = { patient: 'rc.f.patient', symptoms: 'rc.f.reported', vitals: 'rc.f.vitals', location: 'rc.f.location' };

export default function ReadinessCard({ emergency: e }) {
  const t = useT();
  const card = readinessCard(e, checklists[e.type] || [], t);
  const [passport, setPassport] = useState(null); // { rows, simulated } | null
  const [state, setState] = useState('idle'); // idle | loading | open | error
  const [error, setError] = useState(null);
  const patientId = e.patient_id;

  // One call per click. Nothing here loads the passport by itself.
  async function openPassport() {
    setState('loading');
    setError(null);
    try {
      const data = await api.getPassport(patientId);
      setPassport({ rows: passportRows(data), simulated: data?.simulated !== false });
      setState('open');
    } catch (err) {
      setError(passportError(err));
      setState('error');
    }
  }

  return (
    <section data-testid="readiness-card" aria-label={t('rc.title')} className="rounded-2xl border-2 border-slate-300 bg-white p-4">
      <h3 className="mb-3 text-xl font-bold">{t('rc.title')} <span className="text-sm font-normal text-slate-500">(simulated)</span></h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-500">{t('rc.eta')}</dt><dd data-testid="ready-eta" data-known={card.eta.known} className="text-lg font-bold">{card.eta.text}</dd></div>
        <div><dt className="text-sm text-slate-500">{t('rc.checklist')}</dt><dd data-testid="ready-checklist" className="text-lg font-bold">{card.checklist.text}</dd></div>
        <div><dt className="text-sm text-slate-500">{t('sec.team')}</dt><dd data-testid="ready-team" className="text-lg font-bold">{card.team.text}</dd></div>
        {card.facts.map((f) => (
          <div key={f.key}><dt className="text-sm text-slate-500">{t('rc.fromAlert', { label: t(FACT_KEY[f.key] || 'rc.f.reported') })}</dt><dd data-testid={`ready-${f.key}`} className="text-lg font-semibold">{f.value}</dd></div>
        ))}
      </dl>

      <div className="mt-4 border-t border-slate-200 pt-3">
        {state !== 'open' && (
          <>
            <button
              data-testid="open-passport"
              onClick={openPassport}
              disabled={state === 'loading' || !patientId}
              className="rounded-lg border-2 border-sky-700 bg-white px-4 py-2 font-bold text-sky-800 hover:bg-sky-50 disabled:opacity-50"
            >
              {state === 'loading' ? t('rc.opening') : t('rc.openPassport')}
            </button>
            <p className="mt-2 text-sm text-slate-600">
              {patientId ? t('rc.passportHint') : t('rc.noPatientId')}
            </p>
          </>
        )}
        {state === 'error' && error && (
          <p data-testid="passport-error" data-kind={error.kind} role="alert" className="mt-2 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error.text}</p>
        )}
        {state === 'open' && passport && (
          <div data-testid="passport-panel">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h4 className="font-bold">{t('rc.passport')} {passport.simulated && <span className="text-sm font-normal text-slate-500">{t('rc.passportSim')}</span>}</h4>
              <button data-testid="close-passport" onClick={() => setState('idle')} className="ml-auto rounded-lg border border-slate-400 px-3 py-1 font-semibold hover:bg-slate-50">{t('rc.hide')}</button>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2">
              {passport.rows.map((r) => (
                <div key={r.key}><dt className="text-sm text-slate-500">{r.label}</dt><dd data-testid={`passport-${r.key}`} className="font-semibold">{r.value}</dd></div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-slate-600">{t('rc.passportNote')}</p>
          </div>
        )}
      </div>
    </section>
  );
}
