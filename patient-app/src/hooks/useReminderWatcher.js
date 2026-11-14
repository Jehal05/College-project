// Watches the reminders while the app is open (it cannot remind when the app is closed). Every 10 seconds it checks which
// reminders are due, records that they were shown, and offers "Taken" and "Remind me in 10 minutes".
// A hidden tab gets a browser notification only if the person turned those on, and it never contains the medicine name.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getReminderLog, getReminders, markReminderShown, markReminderTaken } from '../services/api';
import { showAlert } from '../utils/browserAlerts';
import { SNOOZE_MS, slotKey, snoozedBack, visibleDue } from '../utils/reminderSchedule';
import i18n from '../i18n';

export default function useReminderWatcher(patientId) {
  const [due, setDue] = useState([]);
  const reminders = useRef([]);
  const handled = useRef(new Set()); // slots marked taken
  const snoozed = useRef(new Map()); // slot key -> time in ms it comes back
  const announced = useRef(new Set()); // slots already shown or notified (each only once)

  const check = useCallback(() => {
    const now = new Date();
    const list = [...visibleDue(reminders.current, now, handled.current, snoozed.current),
      ...snoozedBack(reminders.current, now, handled.current, snoozed.current)];
    const unique = [...new Map(list.map((d) => [d.key, d])).values()];
    unique.forEach((d) => {
      if (announced.current.has(d.key)) return;
      announced.current.add(d.key);
      markReminderShown(patientId, d.reminder.id, d.slot.toISOString()).catch(() => {});
      showAlert(i18n.t('reminders.notifyTitle'), i18n.t('reminders.notifyBody')); // no medicine name, ever
    });
    setDue(unique);
  }, [patientId]);

  const reload = useCallback(() => {
    const since = Date.now() - 7 * 86400000;
    Promise.all([getReminders(patientId), getReminderLog(patientId)]).then(([list, log]) => {
      reminders.current = list;
      log.forEach((e) => { if (e.taken_at && Date.parse(e.scheduled_for) >= since) handled.current.add(e.reminder_id + '|' + e.scheduled_for); });
      log.forEach((e) => announced.current.add(e.reminder_id + '|' + e.scheduled_for)); // already recorded earlier
      check();
    }).catch(() => {});
  }, [patientId, check]);

  useEffect(() => {
    reload();
    const timer = setInterval(check, 10000);
    window.addEventListener('ht:reminders-changed', reload);
    const resetAll = () => { handled.current.clear(); snoozed.current.clear(); announced.current.clear(); reload(); }; // demo reset
    window.addEventListener('ht:reset', resetAll);
    return () => { clearInterval(timer); window.removeEventListener('ht:reminders-changed', reload); window.removeEventListener('ht:reset', resetAll); };
  }, [reload, check]);

  const taken = (d) => {
    handled.current.add(d.key);
    markReminderTaken(patientId, d.reminder.id, d.slot.toISOString(), new Date().toISOString()).catch(() => {});
    check();
  };
  const snooze = (d) => { snoozed.current.set(d.key, Date.now() + SNOOZE_MS); check(); };
  return { due, taken, snooze };
}
