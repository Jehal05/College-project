import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AlertAnnouncer from './components/AlertAnnouncer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import HospitalFallbackBanner from './components/HospitalFallbackBanner.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NavBar from './components/NavBar.jsx';
import { useT } from './i18n/index.js';

// One chunk per page: the browser loads a page's code only when the route is opened.
const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const MapPage = lazy(() => import('./pages/Map.jsx'));
const Fleet = lazy(() => import('./pages/Fleet.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Crew = lazy(() => import('./pages/Crew.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const Activity = lazy(() => import('./pages/Activity.jsx'));
const Report = lazy(() => import('./pages/Report.jsx'));

function PageLoading() {
  const t = useT();
  return <p role="status" data-testid="page-loading" className="p-6 text-xl text-slate-600">{t('common.loading')}</p>;
}

function Shell({ children }) {
  const { pathname } = useLocation();
  // Keyboard users jump over the navigation straight to the queue (only on the dashboard, where the queue is).
  const skip = (e) => {
    const target = document.getElementById('alert-queue');
    if (!target) return;
    e.preventDefault();
    target.focus();
  };
  return (
    <div className="min-h-screen flex flex-col">
      {pathname === '/dashboard' && (
        <a href="#alert-queue" onClick={skip} data-testid="skip-link" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[3000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-slate-900">
          Skip to alert queue
        </a>
      )}
      <AlertAnnouncer />
      <NavBar />
      <OfflineBanner />
      <HospitalFallbackBanner />
      <main className="flex-1">
        {/* A screen error shows a message here; the navigation stays usable and a new page starts clean. */}
        <ErrorBoundary key={pathname}><Suspense fallback={<PageLoading />}>{children}</Suspense></ErrorBoundary>
      </main>
    </div>
  );
}

const staff = ['staff', 'admin'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={<PageLoading />}><Login /></Suspense>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={<ProtectedRoute roles={staff}><Shell><Dashboard /></Shell></ProtectedRoute>}
      />
      <Route
        path="/map"
        element={<ProtectedRoute roles={staff}><Shell><MapPage /></Shell></ProtectedRoute>}
      />
      <Route
        path="/fleet"
        element={<ProtectedRoute roles={staff}><Shell><Fleet /></Shell></ProtectedRoute>}
      />
      <Route
        path="/history"
        element={<ProtectedRoute roles={staff}><Shell><History /></Shell></ProtectedRoute>}
      />
      <Route
        path="/report/:emergencyId"
        element={<ProtectedRoute roles={staff}><Shell><Report /></Shell></ProtectedRoute>}
      />
      <Route
        path="/activity"
        element={<ProtectedRoute roles={staff}><Shell><Activity /></Shell></ProtectedRoute>}
      />
      <Route
        path="/analytics"
        element={<ProtectedRoute roles={staff}><Shell><Analytics /></Shell></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<ProtectedRoute roles={['admin']}><Shell><Admin /></Shell></ProtectedRoute>}
      />
      {/* Crew side of the chat (feature #49). Open it in a second browser tab. */}
      <Route path="/crew/:emergencyId" element={<ProtectedRoute roles={staff}><Suspense fallback={<PageLoading />}><Crew /></Suspense></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
