// Hidden demo control panel at /demo (Feature 57 interface).
// One button per emergency scenario, plus Reset. Talks to the mock server's /demo endpoints.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { runDemoScenario, resetDemo } from '../services/api';
import { CATEGORIES } from '../config/symptoms';
import { setActive, clearActive } from '../utils/activeEmergency';
import DemoLocationToggle from '../components/DemoLocationToggle';
import ErrorMessage from '../components/ErrorMessage';

export default function DemoTools() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function reset() {
    setBusy(true); setError(''); setMessage('');
    try {
      await resetDemo();
      clearActive();
      setMessage(t('demo.resetDone'));
    } catch {
      setError(t('demo.error'));
    } finally {
      setBusy(false);
    }
  }

  const button = 'mb-3 min-h-[52px] w-full rounded-lg px-4 text-lg font-bold disabled:opacity-60 ';
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{t('demo.title')}</h1>
      <p className="mb-4 text-slate-700">{t('demo.note')}</p>
      <ErrorMessage>{error}</ErrorMessage>
      {message && <p role="status" className="mb-3 rounded-lg bg-green-100 p-3 font-semibold text-green-800">{message}</p>}
      {CATEGORIES.map((c) => (
        <button key={c.type} type="button" disabled={busy} onClick={() => run(c.type)} className={button + 'bg-red-700 text-white'}>
          {t('demo.run', { type: t('emergencyType.' + c.type) })}
        </button>
      ))}
      <button type="button" disabled={busy} onClick={reset} className={button + 'bg-slate-200'}>{t('demo.reset')}</button>
      <DemoLocationToggle />
      <p className="mt-4 text-sm text-slate-600">{t('demo.speedNote')}</p>
    </div>
  );
}
