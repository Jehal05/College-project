// App shell: phone-width column with skip link, simulated banner, offline banner, page content and bottom navigation.
// The bottom navigation is hidden on the emergency screen so nobody leaves it by accident.
import { useLocation } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import SimulatedBanner from './components/SimulatedBanner';
import OfflineBanner from './components/OfflineBanner';
import SkipLink from './components/SkipLink';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav from './components/BottomNav';
import SafetyCheckInHost from './components/SafetyCheckInHost';
import DesktopShell from './components/shell/DesktopShell';
import UtilityBar from './components/shell/UtilityBar';
import SiteFooter from './components/shell/SiteFooter';
import AppRoutes from './routes';
import useIsDesktop from './hooks/useIsDesktop';
import { isThemed } from './config/navigation';
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
  const desktop = useIsDesktop();
  const themed = isThemed(pathname);
  const plain = pathname.startsWith('/emergency/') || pathname.startsWith('/p/') || pathname === '/login';
  const showNav = isPatient && !pathname.startsWith('/emergency/') && !pathname.startsWith('/p/');
  const content = <ErrorBoundary key={pathname}><AppRoutes /></ErrorBoundary>;
  if (desktop && isPatient && !plain) {
    return (
      <>
        <DesktopShell>{content}</DesktopShell>
        <SafetyCheckInHost />
      </>
    );
  }
  return (
    <div className={'mx-auto flex min-h-screen max-w-md flex-col shadow-lift ' + (themed ? 'ht-themed bg-ht-bg text-ht-text' : 'bg-slate-50')}>
      <SkipLink />
      {isPatient && !plain && <UtilityBar />}
      <SimulatedBanner />
      {!pathname.startsWith('/emergency') && !pathname.startsWith('/p/') && <AppHeader />}
      <main id="main" tabIndex={-1} className="flex-1 p-4">
        <OfflineBanner />
        {content}
      </main>
      {isPatient && !plain && <SiteFooter />}
      {showNav && <BottomNav />}
      {isPatient && <SafetyCheckInHost />}
    </div>
  );
}
