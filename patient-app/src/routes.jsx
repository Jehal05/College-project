// All pages. Everything except /login needs a login; unknown addresses show "not found".
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { homeFor } from './utils/roles';
import useAuth from './hooks/useAuth';
import Login from './screens/Login';
import Home from './screens/Home';
import Profile from './screens/Profile';
import Contacts from './screens/Contacts';
import Symptoms from './screens/Symptoms';
import Emergency from './screens/Emergency';
import Cancelled from './screens/Cancelled';
import { Skeleton } from './components/ui/Feedback';
import NeedsConnection from './components/NeedsConnection';

// Screens that only work with the server are loaded the first time they are opened (they are not part of the offline install,
// see vite.config.js). A failed load shows the calm error page, whose Call 112 / 108 link is plain HTML.
const screen = (load) => lazy(() => load().catch(() => ({ default: NeedsConnection })));
const About = screen(() => import('./screens/About'));
const Hospitals = screen(() => import('./screens/Hospitals'));
const Passport = screen(() => import('./screens/Passport'));
const PassportView = screen(() => import('./screens/PassportView'));
const Consent = screen(() => import('./screens/Consent'));
const AccessLog = screen(() => import('./screens/AccessLog'));
const Summary = screen(() => import('./screens/Summary'));

function Waiting() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('common.working')} className="space-y-3 pt-2">
      <Skeleton className="h-8 w-1/2" /><Skeleton className="h-24" /><Skeleton className="h-24" />
    </div>
  );
}
import NotFound from './screens/NotFound';

// Patient screens. Anyone else who signs in goes to their own screen and cannot open patient screens.
function Protected({ children }) {
  const { isLoggedIn, session } = useAuth();
  const location = useLocation();
  // Remember the page that was asked for, so signing in brings the person back to it (for example /demo or /twin).
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return session && session.role !== 'PATIENT' ? <Navigate to={homeFor(session.role)} replace /> : children;
}


export default function AppRoutes() {
  return (
    <Suspense fallback={<Waiting />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/access" element={<Protected><AccessLog /></Protected>} />
      <Route path="/consent" element={<Protected><Consent /></Protected>} />
      <Route path="/contacts" element={<Protected><Contacts /></Protected>} />
      <Route path="/passport" element={<Protected><Passport /></Protected>} />
      <Route path="/p/:token" element={<PassportView />} />
      <Route path="/symptoms" element={<Protected><Symptoms /></Protected>} />
      <Route path="/emergency/:id" element={<Protected><Emergency /></Protected>} />
      <Route path="/cancelled" element={<Protected><Cancelled /></Protected>} />
      <Route path="/summary/:id" element={<Protected><Summary /></Protected>} />
      <Route path="/hospitals" element={<Protected><Hospitals /></Protected>} />
      <Route path="/about" element={<Protected><About /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
