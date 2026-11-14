import { useSyncExternalStore } from 'react';
import { useT } from '../i18n/index.js';
import { getStatus, onStatus } from '../services/socket.js';

const STYLES = {
  live: ['conn.live', 'bg-emerald-100 text-emerald-800 border-emerald-500', 'bg-emerald-500'],
  reconnecting: ['conn.reconnecting', 'bg-red-100 text-red-800 border-red-500', 'bg-red-500 animate-pulse'],
  connecting: ['conn.connecting', 'bg-slate-100 text-slate-700 border-slate-400', 'bg-slate-400 animate-pulse'],
  mock: ['conn.mock', 'bg-amber-100 text-amber-800 border-amber-500', 'bg-amber-500'],
};

/** Shows whether alerts are arriving live, the connection dropped, or mock data is in use. */
export default function ConnectionBadge() {
  const t = useT();
  const status = useSyncExternalStore(onStatus, getStatus);
  const [label, box, dot] = STYLES[status] || STYLES.connecting;
  return (
    <span data-testid="connection" className={`inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-sm font-semibold ${box}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {t(label)}
    </span>
  );
}
