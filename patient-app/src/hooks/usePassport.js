// Loads the patient's current passport, how often it was opened and who looked; creates (or rotates) and revokes it.
// Passport data is kept in memory only (never in the offline saved copies).
import { useCallback, useEffect, useState } from 'react';
import { createPassport, getPassport, getPassportHistory, getPassportLog, getPublicConfig, revokePassport } from '../services/api';
import { isExpired } from '../utils/passportTime';

const REFRESH_MS = 5000; // keeps "Opened N times" honest while the screen is open

export default function usePassport(patientId) {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [passport, setPassport] = useState(null); // { token, expires_at, fields } | null
  const [log, setLog] = useState([]);
  const [history, setHistory] = useState([]);
  const [publicUrl, setPublicUrl] = useState(null); // address the server says phones can reach, or null

  const load = useCallback(async () => {
    try {
      const current = await getPassport(patientId).catch((err) => { if (err.status === 404) return null; throw err; });
      const live = current && !isExpired(current.expires_at) ? current : null;
      setPassport(live);
      setLog(live ? await getPassportLog(patientId) : []);
      setHistory(await getPassportHistory(patientId).catch(() => []));
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error')); // already showing a passport: keep it (offline)
    }
  }, [patientId]);

  useEffect(() => {
    load();
    getPublicConfig().then((c) => setPublicUrl(c.public_url || null)).catch(() => setPublicUrl(null));
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const create = async (hours, fields) => { // throws on failure so the screen can say so; making a new one rotates (the old link stops)
    const made = await createPassport(patientId, hours, fields);
    setPassport(made); setLog([]); setStatus('ready');
  };
  const revoke = async () => {
    await revokePassport(patientId);
    setPassport(null); setLog([]);
  };
  return { status, passport, log, history, publicUrl, create, revoke, reload: load };
}
