// Bell on Home: a short list of simulated updates (hospital, ambulance, contacts, passport opened) and the opt-in browser alerts switch.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../hooks/useNotifications';
import { clearNotifications, markAllRead } from '../utils/notifications';
import { alertsOn, alertsSupported, disableAlerts, enableAlerts } from '../utils/browserAlerts';
import { formatTime } from '../utils/time';
import Switch from './Switch';

export default function NotificationBell() {
  const { t } = useTranslation();
  const items = useNotifications();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState(alertsOn());
  const [problem, setProblem] = useState('');
  const unread = items.filter((i) => !i.read).length;

  function toggle() {
    if (!open) markAllRead();
    setOpen(!open);
  }
  async function changeAlerts(on) {
    setProblem('');
    if (!on) { disableAlerts(); setAlerts(false); return; }
    const result = await enableAlerts();
    setAlerts(result === 'on');
    if (result !== 'on') setProblem(t(result === 'unsupported' ? 'notif.browser.unsupported' : 'notif.browser.denied'));
  }

  return (
    <div className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls="notif-panel"
        aria-label={t('notif.bell', { count: unread })} className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-300 text-xl">
        <span aria-hidden="true">🔔</span>
        {unread > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-blue-700 px-1 text-center text-xs font-bold text-white">{unread}</span>}
      </button>
      <p role="status" className="sr-only">{unread > 0 ? t('notif.bell', { count: unread }) : ''}</p>
      {open && (
        <section id="notif-panel" aria-label={t('notif.title')} className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-300 bg-white p-3 shadow-lg">
          <h2 className="mb-2 text-lg font-bold">{t('notif.title')}</h2>
          {items.length === 0 ? <p className="text-sm text-slate-700">{t('notif.empty')}</p> : (
            <ul className="mb-2 space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.id} className="rounded-lg bg-slate-50 p-2"><span className="font-semibold">{t(i.key)}</span> <span className="text-slate-600">· {formatTime(i.at)}</span></li>
              ))}
            </ul>
          )}
          {items.length > 0 && <button type="button" onClick={clearNotifications} className="mb-3 min-h-[44px] rounded-lg bg-slate-200 px-4 font-semibold">{t('notif.clear')}</button>}
          {alertsSupported() && (
            <div className="border-t border-slate-200 pt-2">
              <p id="alerts-label" className="font-semibold">{t('notif.browser.label')}</p>
              <p className="mb-1 text-sm text-slate-700">{t('notif.browser.help')}</p>
              <Switch checked={alerts} onChange={changeAlerts} labelId="alerts-label" />
              {problem && <p role="status" className="mt-1 text-sm text-amber-900">{problem}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
