// The reminders list for the Reminders screen, plus the last 7 days of the taken log. All of it lives on the server.
import { useCallback, useEffect, useState } from 'react';
import { addReminder, deleteReminder, getReminderLog, getReminders, updateReminder } from '../services/api';

const changed = () => window.dispatchEvent(new Event('ht:reminders-changed')); // tells the reminder watcher to reload

export default function useReminders(patientId) {
  const [list, setList] = useState([]);
  const [log, setLog] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(() => {
    setStatus('loading');
    Promise.all([getReminders(patientId), getReminderLog(patientId)])
      .then(([l, g]) => { setList(l); setLog(g); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [patientId]);
  useEffect(load, [load]);

  // Each action resolves when saved and rejects with the server's message (shown by the screen).
  const act = (promise) => promise.then((r) => { changed(); load(); return r; });
  return {
    list, log, status, load,
    add: (r) => act(addReminder(patientId, r)),
    update: (rid, r) => act(updateReminder(patientId, rid, r)),
    remove: (rid) => act(deleteReminder(patientId, rid)),
  };
}
