// An emergency that could not be sent because the network was down is kept in sessionStorage ("ht.pending").
// It is NEVER shown as sent. It is created on the server only when the connection is back.
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from './useAuth';
import useOnline from './useOnline';
import { createEmergency, getPatient } from '../services/api';
import { setActive, setStarted } from '../utils/activeEmergency';

const KEY = 'ht.pending'; // { type, symptoms: [IDs], created_at }
const MAX_AGE_MS = 10 * 60 * 1000; // older than this: ask the user instead of sending automatically
const DEFAULT_CONSENTS = { location: true, history: true, vitals: true, reports: true };
const listeners = new Set();

const readRaw = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
const notify = () => listeners.forEach((fn) => fn());
export function setPending(type, symptoms) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ type, symptoms, created_at: new Date().toISOString() })); } catch { /* ignore */ }
  notify();
}
export function clearPending() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  notify();
}
export const isStale = (pending) => Date.now() - Date.parse(pending.created_at) > MAX_AGE_MS;

export function usePending() {
  const raw = useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, readRaw);
  return useMemo(() => (raw ? JSON.parse(raw) : null), [raw]);
}

// Create the emergency on the server and remember it as the active one. Throws if it fails.
export async function startEmergency(patientId, type, symptoms, savedConsents) {
  const consents = (savedConsents || (await getPatient(patientId).then((p) => p.consents).catch(() => null))) || DEFAULT_CONSENTS;
  const e = await createEmergency({ patient_id: patientId, type, symptoms, consents });
  setStarted(e.id, Date.now());
  setActive(e.id);
  return e;
}

let inFlight = null; // so the automatic retry and the "Try again" button never send twice
export function sendPending(patientId) {
  if (inFlight) return inFlight;
  const pending = JSON.parse(readRaw() || 'null');
  if (!pending) return Promise.reject(new Error('nothing pending'));
  inFlight = startEmergency(patientId, pending.type, pending.symptoms)
    .then((e) => { clearPending(); return e; })
    .finally(() => { inFlight = null; });
  return inFlight;
}

// Used once in App: when the connection returns, send a fresh pending emergency and open it.
export function useAutoSend() {
  const { session } = useAuth();
  const online = useOnline();
  const pending = usePending();
  const navigate = useNavigate();
  useEffect(() => {
    if (!session || !online || !pending || isStale(pending)) return;
    sendPending(session.patient_id).then((e) => navigate('/emergency/' + e.id)).catch(() => { /* stays pending; user can retry */ });
  }, [session, online, pending, navigate]);
}
