// Demo panel at /demo (demo builds and `npm run dev` only). One tidy screen for rehearsals: pick a scenario, reset,
// change the speed and the simulated vitals, simulate a fall or no connection, and tick off the rehearsal steps.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { runDemoScenario, resetDemo, API_URL } from '../services/api';
import pkg from '../../package.json';
import { CATEGORIES } from '../config/symptoms';
import { setActive, clearActive } from '../utils/activeEmergency';
import { clearNotifications } from '../utils/notifications';
import { setSimulatedOffline } from '../utils/simulatedOffline';
import { endCheckIn } from '../utils/checkIn';
import { clearPending } from '../hooks/usePendingEmergency';
import useDemoState from '../hooks/useDemoState';
import DemoLocationToggle from '../components/DemoLocationToggle';
import DemoSpeedVitals from '../components/DemoSpeedVitals';
import DemoSimulate from '../components/DemoSimulate';
import DemoRehearsal from '../components/DemoRehearsal';
import ErrorMessage from '../components/ErrorMessage';

export default function DemoTools() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, error: stateError, refresh } = useDemoState();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState([]); // ticked rehearsal steps (memory only)

  async function run(type) {
    setBusy(true); setError(''); setMessage('');
    try {
      const e = await runDemoScenario(type);
      setActive(e.id);
      navigate('/emergency/' + e.id);
    } catch {
      setError(t('demo.error'));
      setBusy(false);
    }
  }

  // Reset everything: the server's data, and what the app keeps in memory (bell list, trend, unsent alert, ticks).
  async function reset() {
    setBusy(true); setError(''); setMessage('');
    try {
      await resetDemo();
      clearActive(); clearPending(); clearNotifications(); endCheckIn(); setSimulatedOffline(false);
      window.dispatchEvent(new Event('ht:reset')); // empties the vitals trend and the reminder memory
      setDone([]);
      await refresh();
      setMessage(t('demo.resetDone'));
    } catch {
      setError(t('demo.error'));
    } finally {
      setBusy(false);
    }
  }

  // Development only: lets us test the error screen on purpose (/demo?crash=1). Never active in a build.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('crash')) throw new Error('Deliberate test crash');

  const button = 'mb-3 min-h-[52px] w-full rounded-lg px-4 text-lg font-bold disabled:opacity-60 ';
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{t('demo.title')}</h1>
      <p role="status" data-testid="demo-status" className="mb-2 rounded-lg bg-slate-100 p-2 font-semibold">
        {state ? t('demo.status', { speed: state.speed, profile: t('demo.profile.' + state.vitals.profile) }) : t('demo.statusLoading')}
      </p>
      <p className="mb-4 text-slate-700">{t('demo.note')}</p>
      <ErrorMessage>{error || (stateError ? t('demo.error') : '')}</ErrorMessage>
      {message && <p role="status" className="mb-3 rounded-lg bg-green-100 p-3 font-semibold text-green-800">{message}</p>}
      {CATEGORIES.map((c) => (
        <button key={c.type} type="button" disabled={busy} onClick={() => run(c.type)} className={button + 'bg-red-700 text-white'}>
          {t('demo.run', { type: t('emergencyType.' + c.type) })}
        </button>
      ))}
      <button type="button" disabled={busy} onClick={reset} className={button + 'bg-slate-200'}>{t('demo.reset')}</button>
      <DemoSpeedVitals state={state} refresh={refresh} />
      <DemoSimulate />
      <DemoLocationToggle />
      <DemoRehearsal done={done} onToggle={(id) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))} />
      <p className="mt-4 text-sm text-slate-600">{t('demo.speedNote')}</p>
      <p className="mt-2 text-xs text-slate-600">{t('demo.build', { version: pkg.version, api: API_URL })}</p>
    </div>
  );
}
