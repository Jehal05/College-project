// The patient's small settings (today: the safety check-in), kept on the server. A change is saved at once; if saving
// fails the setting goes back to where it was. "ht:prefs-changed" tells other parts of the app (the check-in watcher).
import { useCallback, useEffect, useState } from 'react';
import { getPreferences, savePreferences } from '../services/api';

export const DEFAULT_PREFS = { safety_checkin: { enabled: false, minutes: 15 } };

export default function usePreferences(patientId) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | failed

  const load = useCallback(() => {
    if (!patientId) return;
    getPreferences(patientId).then(setPrefs).catch(() => setPrefs(DEFAULT_PREFS)); // unknown = off, the safe default
  }, [patientId]);
  useEffect(load, [load]);
  useEffect(() => {
    window.addEventListener('ht:prefs-changed', load);
    return () => window.removeEventListener('ht:prefs-changed', load);
  }, [load]);

  const save = useCallback((next) => {
    const before = prefs;
    setPrefs(next);
    setSaveState('saving');
    savePreferences(patientId, next)
      .then((saved) => { setPrefs(saved); setSaveState('saved'); window.dispatchEvent(new Event('ht:prefs-changed')); })
      .catch(() => { setPrefs(before); setSaveState('failed'); });
  }, [prefs, patientId]);

  return { prefs, saveState, save };
}
