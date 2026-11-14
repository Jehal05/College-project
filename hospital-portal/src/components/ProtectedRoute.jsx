import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import { useT } from '../i18n/index.js';

/**
 * Blocks the page unless the user is logged in AND has one of the allowed roles.
 * Not logged in -> /login (remembers where they wanted to go).
 * Wrong role    -> "Access denied" message.
 */
export default function ProtectedRoute({ roles, children }) {
  const { isLoggedIn, role, logout } = useAuth();
  const location = useLocation();
  const t = useT();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(role)) {
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <main id="main" className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <h1 data-testid="access-denied" className="text-2xl font-bold text-red-700">{t('access.title')}</h1>
          <p className="mt-2 text-slate-600">{t('access.body', { role })}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link data-testid="access-back" to="/dashboard" className="rounded-lg bg-sky-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-sky-700">{t('access.back')}</Link>
            <button data-testid="access-logout" onClick={() => logout()} className="rounded-lg border-2 border-slate-300 px-5 py-2.5 text-lg font-semibold hover:bg-slate-50">{t('access.logout')}</button>
          </div>
        </main>
      </div>
    );
  }
  return children;
}
