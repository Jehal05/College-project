// Demo panel: things that are hard to do on demand. A simulated fall, "no data connection" and server errors.
// "No data connection" is a switch inside the app; the browser's real network is never touched.
import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { setDemoFail } from '../services/api';
import { isSimulatedOffline, onSimulatedOffline, setSimulatedOffline } from '../utils/simulatedOffline';
import { startCheckIn } from '../utils/checkIn';
import Switch from './Switch';

export default function DemoSimulate() {
  const { t } = useTranslation();
  const offline = useSyncExternalStore(onSimulatedOffline, isSimulatedOffline);
  const [serverError, setServerError] = useState(false);
  const toggleServer = (on) => setDemoFail(on ? 'server' : 'off').then(() => setServerError(on)).catch(() => {});
  return (
    <section aria-labelledby="demo-sim" className="mb-4 rounded-card border border-slate-200 bg-white p-3 shadow-card">
      <h2 id="demo-sim" className="mb-2 text-lg font-bold">{t('demo.simTitle')}</h2>
      <button type="button" onClick={() => startCheckIn('FALL_CHECK')} className="mb-3 min-h-[52px] w-full rounded-xl border-2 border-slate-500 font-bold">
        {t('demo.fall')}
      </button>
      <p id="sim-offline" className="font-semibold">{t('demo.offline')}</p>
      <Switch checked={offline} labelId="sim-offline" onChange={setSimulatedOffline} />
      <p id="sim-server" className="mt-2 font-semibold">{t('demo.serverError')}</p>
      <Switch checked={serverError} labelId="sim-server" onChange={toggleServer} />
      <p className="mt-1 text-xs text-slate-700">{t('demo.simHelp')}</p>
    </section>
  );
}
