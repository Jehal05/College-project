// Demo panel: playback speed of the simulated hospital response, and the simulated wearable's vitals profile and pinned values.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setDemoSpeed, setDemoVitals } from '../services/api';
import ErrorMessage from './ErrorMessage';

const SPEEDS = [1, 2, 5, 10, 20];
const VITALS = ['heart_rate', 'spo2', 'bp_sys', 'bp_dia', 'glucose', 'resp_rate'];
const btn = (on) => 'min-h-[48px] rounded-xl border-2 px-3 font-bold ' + (on ? 'border-brand-700 bg-brand-50 text-brand-900' : 'border-slate-400');

export default function DemoSpeedVitals({ state, refresh }) {
  const { t } = useTranslation();
  const [pins, setPins] = useState({});
  const [problem, setProblem] = useState('');
  const run = (promise) => promise.then(() => { setProblem(''); return refresh(); }).catch((err) => setProblem(err.message || t('demo.error')));

  function apply() {
    const overrides = {};
    VITALS.forEach((k) => { if (pins[k] !== undefined && pins[k] !== '') overrides[k] = Number(pins[k]); });
    run(setDemoVitals({ overrides }));
  }
  return (
    <section aria-labelledby="demo-speed" className="mb-4 rounded-card border border-slate-200 bg-white p-3 shadow-card">
      <h2 id="demo-speed" className="mb-2 text-lg font-bold">{t('demo.speedTitle')}</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {SPEEDS.map((x) => <button key={x} type="button" aria-pressed={state?.speed === x} onClick={() => run(setDemoSpeed(x))} className={btn(state?.speed === x)}>{x}×</button>)}
      </div>
      <p className="mb-3 text-xs text-slate-700">{t('demo.speedHelp')}</p>
      <h2 className="mb-2 text-lg font-bold">{t('demo.profileTitle')}</h2>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(state?.vitals.profiles || []).map((p) => (
          <button key={p} type="button" aria-pressed={state.vitals.profile === p} onClick={() => run(setDemoVitals({ profile: p }))} className={btn(state.vitals.profile === p)}>
            {t('demo.profile.' + p)}
          </button>
        ))}
      </div>
      <h3 className="mb-1 font-semibold">{t('demo.pinTitle')}</h3>
      <div className="grid grid-cols-2 gap-2">
        {VITALS.map((k) => (
          <label key={k} className="text-sm font-semibold">{t('demo.vital.' + k)}
            <input type="number" inputMode="numeric" value={pins[k] ?? (state?.vitals.overrides[k] ?? '')} onChange={(e) => setPins({ ...pins, [k]: e.target.value })}
              className="mt-1 block min-h-[44px] w-full rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 px-2 font-normal" />
          </label>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={apply} className="min-h-[48px] rounded-xl bg-brand-700 hover:bg-brand-800 font-bold text-white">{t('demo.pinApply')}</button>
        <button type="button" onClick={() => { setPins({}); run(setDemoVitals({ overrides: {} })); }} className="min-h-[48px] rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 font-semibold">{t('demo.pinClear')}</button>
      </div>
      <div className="mt-2"><ErrorMessage>{problem}</ErrorMessage></div>
    </section>
  );
}
