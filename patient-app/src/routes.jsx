// All pages. Everything except /login needs a login; unknown addresses show "not found".
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from './hooks/useAuth';
import Login from './screens/Login';
import Home from './screens/Home';
import Profile from './screens/Profile';
import Contacts from './screens/Contacts';
import Symptoms from './screens/Symptoms';
import Emergency from './screens/Emergency';
import Cancelled from './screens/Cancelled';
import { DEMO_ENABLED } from './config/demo';
import { Skeleton } from './components/ui/Feedback';
import NeedsConnection from './components/NeedsConnection';

// Screens that only work with the server are loaded the first time they are opened (they are not part of the offline install,
// see vite.config.js). A failed load shows the calm error page, whose Call 112 / 108 link is plain HTML.
const screen = (load) => lazy(() => load().catch(() => ({ default: NeedsConnection })));
const Passport = screen(() => import('./screens/Passport'));
const PassportView = screen(() => import('./screens/PassportView'));
const Consent = screen(() => import('./screens/Consent'));
const Reports = screen(() => import('./screens/Reports'));
const Reminders = screen(() => import('./screens/Reminders'));
const Summary = screen(() => import('./screens/Summary'));
const DemoTools = DEMO_ENABLED ? screen(() => import('./screens/DemoTools')) : null; // left out of normal builds

function Waiting() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('common.working')} className="space-y-3 pt-2">
      <Skeleton className="h-8 w-1/2" /><Skeleton className="h-24" /><Skeleton className="h-24" />
    </div>
  );
}
import NotFound from './screens/NotFound';

function Protected({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Waiting />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/consent" element={<Protected><Consent /></Protected>} />
      <Route path="/contacts" element={<Protected><Contacts /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/passport" element={<Protected><Passport /></Protected>} />
      <Route path="/p/:token" element={<PassportView />} />
      <Route path="/symptoms" element={<Protected><Symptoms /></Protected>} />
      <Route path="/emergency/:id" element={<Protected><Emergency /></Protected>} />
      <Route path="/cancelled" element={<Protected><Cancelled /></Protected>} />
      <Route path="/reminders" element={<Protected><Reminders /></Protected>} />
      <Route path="/summary/:id" element={<Protected><Summary /></Protected>} />
      {DEMO_ENABLED && <Route path="/demo" element={<Protected><DemoTools /></Protected>} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
