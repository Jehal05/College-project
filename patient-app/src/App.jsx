// App shell: phone-width column with skip link, simulated banner, offline banner, page content and bottom navigation.
// The bottom navigation is hidden on the emergency screen so nobody leaves it by accident.
import { useLocation } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import SimulatedBanner from './components/SimulatedBanner';
import OfflineBanner from './components/OfflineBanner';
import SkipLink from './components/SkipLink';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav from './components/BottomNav';
import ReminderBanner from './components/ReminderBanner';
import SafetyCheckInHost from './components/SafetyCheckInHost';
import AppRoutes from './routes';
import useAuth from './hooks/useAuth';
import useLanguageSync from './hooks/useLanguageSync';
import useRouteFocus from './hooks/useRouteFocus';
import { useAutoSend } from './hooks/usePendingEmergency';
import { useNotificationFeed } from './hooks/useNotifications';

export default function App() {
  const { isLoggedIn, session } = useAuth();
  const isPatient = Boolean(session) && session.role === 'PATIENT'; // others (family, volunteers, admins) have no reminders or safety check-in
  const { pathname } = useLocation();
  useLanguageSync(); // use the language saved on the patient record
  useAutoSend(); // send an unsent emergency when the connection returns
  useNotificationFeed(); // turn live events into bell notifications
  useRouteFocus(pathname); // move focus to the heading after a page change
  const showNav = isPatient && !pathname.startsWith('/emergency') && !pathname.startsWith('/p/');
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 shadow-lift">
      <SkipLink />
      <SimulatedBanner />
      {!pathname.startsWith('/emergency') && !pathname.startsWith('/p/') && <AppHeader />}
      <main id="main" tabIndex={-1} className="flex-1 p-4">
        <OfflineBanner />
        {isPatient && !pathname.startsWith('/p/') && <ReminderBanner />}
        <ErrorBoundary key={pathname}>
          <AppRoutes />
        </ErrorBoundary>
      </main>
      {showNav && <BottomNav />}
      {isPatient && <SafetyCheckInHost />}
    </div>
  );
}
