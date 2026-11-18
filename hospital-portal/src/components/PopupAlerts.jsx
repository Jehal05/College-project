import { useEffect, useRef, useState } from 'react';
import { useEmergencies } from './EmergencyProvider.jsx';
import { useT } from '../i18n/index.js';
import { popupFor } from '../services/popupAlert.js';

/** Real browser pop-up for new alerts when this tab is in the background. Needs one tap to allow. */
export default function PopupAlerts() {
  const t = useT();
  const { announcement } = useEmergencies();
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied');
  const last = useRef();
  useEffect(() => {
    if (!supported) return;
    const p = popupFor(announcement, { hidden: typeof document !== 'undefined' && document.hidden, permission, lastId: last.current });
    if (!p) return;
    last.current = announcement.id;
    try { new Notification(p.title, { body: p.body, tag: p.tag }); } catch (e) { /* some phones only allow service-worker notifications */ }
  }, [announcement, permission, supported]);
  if (!supported || permission !== 'default') return null;
  return (
    <button type="button" onClick={() => Notification.requestPermission().then(setPermission)}
      className="fixed bottom-3 left-3 z-40 min-h-[44px] rounded-xl border-2 border-slate-700 bg-white px-3 text-sm font-semibold shadow">
      {t('popup.allow')}
    </button>
  );
}
