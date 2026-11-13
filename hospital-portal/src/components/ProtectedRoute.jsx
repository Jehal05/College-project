import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';

/**
 * Blocks the page unless the user is logged in AND has one of the allowed roles.
 * Not logged in -> /login (remembers where they wanted to go).
 * Wrong role    -> "Access denied" message.
 */
export default function ProtectedRoute({ roles, children }) {
  const { isLoggedIn, role } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(role)) {
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-700">Access denied</h1>
          <p className="mt-2 text-slate-600">
            Your role (<b>{role}</b>) cannot open this page.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
