// Real pop-up alerts on the second device: when the portal is open in a background tab (or on another phone or laptop) and a loud
// announcement arrives, the browser shows a system notification. Free, built into the browser, no account.
// Pure decision here; the browser call is in components/PopupAlerts.jsx.
export const POPUP_OK = ['granted'];

/** The notification to show, or null. Only loud (assertive) announcements, only when the tab is hidden, only with permission. */
export function popupFor(announcement, { hidden, permission, lastId } = {}) {
  if (!announcement || announcement.politeness !== 'assertive' || !announcement.text) return null;
  if (!POPUP_OK.includes(permission) || !hidden) return null;
  if (announcement.id !== undefined && announcement.id === lastId) return null; // already shown
  return { title: 'HealthTwin DEMO', body: announcement.text, tag: 'healthtwin-alert' };
}
