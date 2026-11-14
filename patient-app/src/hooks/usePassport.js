// Loads the patient's current passport and how often it was opened; creates and revokes it.
// Passport data is kept in memory only (never in the offline saved copies).
import { useCallback, useEffect, useState } from 'react';
import { createPassport, getPassport, getPassportLog, revokePassport } from '../services/api';
import { isExpired } from '../utils/passportTime';

const REFRESH_MS = 5000; // keeps "Opened N times" honest while the screen is open

export default function usePassport(patientId) {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [passport, setPassport] = useState(null); // { token, expires_at } | null
  const [log, setLog] = useState([]);

  const load = useCallback(async () => {
    try {
      const current = await getPassport(patientId).catch((err) => { if (err.status === 404) return null; throw err; });
      const live = current && !isExpired(current.expires_at) ? current : null;
      setPassport(live);
      setLog(live ? await getPassportLog(patientId) : []);
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error')); // already showing a passport: keep it (offline)
    }
  }, [patientId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const create = async (hours) => { // throws on failure so the screen can say so
    const made = await createPassport(patientId, hours);
    setPassport(made); setLog([]); setStatus('ready');
  };
  const revoke = async () => {
    await revokePassport(patientId);
    setPassport(null); setLog([]);
  };
  return { status, passport, log, create, revoke, reload: load };
}
