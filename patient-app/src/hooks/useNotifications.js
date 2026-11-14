// The bell list, plus one background connection (used once in App) that turns live events into notifications.
import { useEffect, useSyncExternalStore } from 'react';
import { connectEvents } from '../services/socket';
import useAuth from './useAuth';
import { addNotification, getItems, subscribe } from '../utils/notifications';
import { showAlert } from '../utils/browserAlerts';
import i18n from '../i18n';

export const useNotifications = () => useSyncExternalStore(subscribe, getItems);

// event type -> [notification text key, may it also pop up in the browser?]
const FEED = {
  'hospital.acknowledged': ['notif.hospital', true],
  'ambulance.dispatched': ['notif.ambulance', true],
  'contacts.notified': ['notif.contacts', false],
  'passport.opened': ['notif.passport', false],
};

export function useNotificationFeed() {
  const { isLoggedIn } = useAuth();
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const seen = new Set(); // the same event is never listed twice
    return connectEvents((event) => {
      const rule = FEED[event.type];
      const id = event.type + ':' + (event.emergency_id || event.timestamp);
      if (!rule || seen.has(id)) return;
      seen.add(id);
      addNotification(rule[0]);
      if (rule[1]) showAlert(i18n.t('notif.browser.title'), i18n.t(rule[0]));
    }, () => {});
  }, [isLoggedIn]);
}
