// React hook that re-renders a component whenever the login session changes.
import { useSyncExternalStore } from 'react';
import { getSession, subscribe, setSession, clearSession } from '../services/auth';

export default function useAuth() {
  const session = useSyncExternalStore(subscribe, getSession);
  return { session, isLoggedIn: Boolean(session), signIn: setSession, signOut: clearSession };
}
