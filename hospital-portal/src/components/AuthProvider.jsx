import { createContext, useContext, useEffect, useState } from 'react';
import * as auth from '../services/auth.js';
import { connect, disconnect } from '../services/socket.js';
import { saveSession } from '../services/session.js';
import { onSessionExpired } from '../services/sessionExpiry.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => auth.getSession());

  // Open the live connection while logged in; close it on logout.
  useEffect(() => {
    if (!session?.token) return undefined;
    connect(session.token);
    return () => disconnect();
  }, [session?.token]);

  // A 401 from the backend: the session was already cleared, so drop it here too. ProtectedRoute then opens the login screen.
  useEffect(() => onSessionExpired(() => setSession(null)), []);

  const value = {
    session,
    isLoggedIn: Boolean(session?.token),
    role: session?.role || null,
    async login(email, password) {
      const s = await auth.login(email, password);
      setSession(s);
      return s;
    },
    /** The backend did not say which hospital this desk belongs to, so the desk picks one (saved with the session). */
    chooseHospital(id) {
      if (!session || !id || id === session.hospital_id) return;
      const next = { ...session, hospital_id: String(id) };
      saveSession(next);
      setSession(next);
    },
    logout() {
      auth.logout();
      setSession(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
