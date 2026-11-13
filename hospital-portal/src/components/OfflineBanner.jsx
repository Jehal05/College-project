import { useEffect, useState } from 'react';
import { onStatus, getStatus } from '../services/socket.js';
import { useEmergencies } from './EmergencyProvider.jsx';
import { bannerView, nextChangeIn } from '../services/offlineBanner.js';

/** After 10 seconds without a live connection: say so, with a Reload button. Then confirm for 5 seconds. */
export default function OfflineBanner() {
  const { reload, lastReload, loading } = useEmergencies();
  const [conn, setConn] = useState({ lostAt: null, backAt: null });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let previous = getStatus();
    return onStatus((status) => {
      const t = Date.now();
      if (status === 'reconnecting' && previous !== 'reconnecting') setConn((c) => (c.lostAt && !c.backAt ? c : { lostAt: t, backAt: null }));
      if (status === 'live' && previous === 'reconnecting') setConn((c) => (c.lostAt && !c.backAt ? { ...c, backAt: t } : c));
      if (status === 'connecting' || status === 'mock') setConn({ lostAt: null, backAt: null }); // logged out
      previous = status;
    });
  }, []);

  useEffect(() => {
    const wait = nextChangeIn({ ...conn, now: Date.now() });
    if (wait === null) return undefined;
    const id = setTimeout(() => setNow(Date.now()), wait + 20);
    return () => clearTimeout(id);
  }, [conn, now]);

  const reloaded = conn.backAt && lastReload && lastReload.at >= conn.backAt ? lastReload.count : null;
  const view = bannerView({ ...conn, reloaded, now: Math.max(now, conn.backAt || 0, conn.lostAt || 0) });
  if (view.kind === 'none') return null;
  return (
    <div
      role="alert"
      data-testid="offline-banner"
      data-kind={view.kind}
      className={`flex flex-wrap items-center gap-3 border-b-2 px-6 py-2 text-lg font-semibold ${view.kind === 'lost' ? 'border-red-600 bg-red-50 text-red-900' : 'border-emerald-600 bg-emerald-50 text-emerald-900'}`}
    >
      <span data-testid="offline-text">{view.text}</span>
      {view.kind === 'lost' && (
        <button data-testid="offline-reload" onClick={() => reload()} disabled={loading} className="rounded-lg border-2 border-red-700 bg-white px-4 py-1 font-semibold hover:bg-red-100 disabled:opacity-60">
          {loading ? 'Reloading…' : 'Reload'}
        </button>
      )}
    </div>
  );
}
