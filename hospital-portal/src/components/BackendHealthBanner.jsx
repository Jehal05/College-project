import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';
import { useT } from '../i18n/index.js';
import { API_BASE_URL, USE_MOCK } from '../services/config.js';
import { CHECK_EVERY_MS, isBackendDown, onBackendDown, recordCheck, resetHealth } from '../services/backendHealth.js';

/** Real mode only: checks the server every 15 s while logged in and says so when it cannot be reached. */
async function reachable() {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 5000);
  try {
    // no-cors: a server that answers but has no CORS header still counts as reachable. No token is sent.
    await fetch(`${API_BASE_URL}/health`, { mode: 'no-cors', cache: 'no-store', signal: stop.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default function BackendHealthBanner() {
  const t = useT();
  const { isLoggedIn } = useAuth();
  const { reload, loading } = useHospitals();
  const [down, setDown] = useState(isBackendDown());

  useEffect(() => onBackendDown(setDown), []);

  useEffect(() => {
    if (USE_MOCK || !isLoggedIn) return undefined;
    let alive = true;
    const check = async () => {
      const ok = await reachable();
      if (alive) recordCheck(ok);
    };
    check();
    const id = setInterval(check, CHECK_EVERY_MS);
    return () => {
      alive = false;
      clearInterval(id);
      resetHealth();
    };
  }, [isLoggedIn]);

  if (USE_MOCK || !down) return null;
  return (
    <div role="alert" data-testid="backend-banner" className="flex flex-wrap items-center gap-3 border-b-2 border-red-600 bg-red-50 px-6 py-2 text-lg font-semibold text-red-900">
      <span>{t('backend.down')}</span>
      <button data-testid="backend-retry" onClick={async () => { const ok = await reachable(); recordCheck(ok); if (ok) reload(); }} disabled={loading} className="rounded-lg border-2 border-red-700 bg-white px-4 py-1 font-semibold hover:bg-red-100 disabled:opacity-60">
        {loading ? t('offline.reloading') : t('offline.reload')}
      </button>
    </div>
  );
}
