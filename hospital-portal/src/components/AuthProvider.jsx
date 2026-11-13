import { createContext, useContext, useEffect, useState } from 'react';
import * as auth from '../services/auth.js';
import { connect, disconnect } from '../services/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => auth.getSession());

  // Open the live connection while logged in; close it on logout.
  useEffect(() => {
    if (!session?.token) return undefined;
    connect(session.token);
    return () => disconnect();
  }, [session?.token]);

  const value = {
    session,
    isLoggedIn: Boolean(session?.token),
    role: session?.role || null,
    async login(email, password) {
      const s = await auth.login(email, password);
      setSession(s);
      return s;
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
