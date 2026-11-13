// Optional pop-ups from the browser. OFF by default; the person must turn them on and allow them.
// Used only for hospital/ambulance status changes while the tab is hidden. Text carries no medical detail.
const KEY = 'ht.browserAlerts';
export const alertsSupported = () => typeof Notification !== 'undefined';
export const alertsOn = () => {
  try { return alertsSupported() && sessionStorage.getItem(KEY) === '1' && Notification.permission === 'granted'; } catch { return false; }
};

// Returns 'on' | 'denied' | 'unsupported'.
export async function enableAlerts() {
  if (!alertsSupported()) return 'unsupported';
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';
    sessionStorage.setItem(KEY, '1');
    return 'on';
  } catch { return 'denied'; }
}
export function disableAlerts() { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } }

export function showAlert(title, body) {
  if (!alertsOn() || !document.hidden) return;
  try { new Notification(title, { body }); } catch { /* a blocked pop-up must never break the app */ }
}
