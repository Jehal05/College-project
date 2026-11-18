import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AlertAnnouncer from './components/AlertAnnouncer.jsx';
import PopupAlerts from './components/PopupAlerts.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import BackendHealthBanner from './components/BackendHealthBanner.jsx';
import HospitalFallbackBanner from './components/HospitalFallbackBanner.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import SoundBanner from './components/SoundBanner.jsx';
import AlertTitleCue from './components/AlertTitleCue.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NavBar from './components/NavBar.jsx';
import { useT } from './i18n/index.js';

// One chunk per page: the browser loads a page's code only when the route is opened.
const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const MapPage = lazy(() => import('./pages/Map.jsx'));
const Fleet = lazy(() => import('./pages/Fleet.jsx'));
const Crew = lazy(() => import('./pages/Crew.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const PassportScan = lazy(() => import('./pages/PassportScan.jsx'));
const Report = lazy(() => import('./pages/Report.jsx'));

function PageLoading() {
  const t = useT();
  return <p role="status" data-testid="page-loading" className="p-6 text-xl text-slate-600">{t('common.loading')}</p>;
}

const skipClass = 'sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[3000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-slate-900';

function Shell({ children }) {
  const { pathname } = useLocation();
  const t = useT();
  // Keyboard users jump over the navigation straight to the queue (only on the dashboard, where the queue is).
  const skip = (e) => {
    const target = document.getElementById('alert-queue');
    if (!target) return;
    e.preventDefault();
    target.focus();
  };
  const skipMain = (e) => {
    const target = document.getElementById('main');
    if (!target) return;
    e.preventDefault();
    target.focus();
  };
  return (
    <div className="ht-page min-h-screen flex flex-col">
      <a href="#main" onClick={skipMain} data-testid="skip-main" className={skipClass}>{t('a11y.skipMain')}</a>
      {pathname === '/dashboard' && (
        <a href="#alert-queue" onClick={skip} data-testid="skip-link" className={`${skipClass}`}>{t('a11y.skipQueue')}</a>
      )}
      <AlertAnnouncer />
      <PopupAlerts />
      <NavBar />
      <BackendHealthBanner />
      <OfflineBanner />
      <SoundBanner />
      <AlertTitleCue />
      <HospitalFallbackBanner />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {/* A screen error shows a message here; the navigation stays usable and a new page starts clean. */}
        <ErrorBoundary key={pathname}><Suspense fallback={<PageLoading />}>{children}</Suspense></ErrorBoundary>
      </main>
      <footer data-testid="site-footer" className="no-print border-t border-slate-300 bg-white/80 px-6 py-3 text-sm text-slate-700">
        {t('footer.simulated')}
      </footer>
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
        path="/passport"
        element={<ProtectedRoute roles={staff}><Shell><PassportScan /></Shell></ProtectedRoute>}
      />
      {/* Crew side of the chat (feature #49). Open it in a second browser tab. */}
      <Route path="/crew/:emergencyId" element={<ProtectedRoute roles={staff}><Suspense fallback={<PageLoading />}><Crew /></Suspense></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
