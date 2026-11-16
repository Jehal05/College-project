// Desktop layout for signed-in patients: fixed left sidebar, top bar and a wide workspace.
// Themed pages draw with the theme tokens; older pages sit on a light surface so they stay readable in dark mode.
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SimulatedBanner from '../SimulatedBanner';
import UtilityBar from './UtilityBar';
import Breadcrumb from './Breadcrumb';
import SiteFooter from './SiteFooter';
import OfflineBanner from '../OfflineBanner';
import SkipLink from '../SkipLink';
import { isThemed } from '../../config/navigation';

export default function DesktopShell({ children, reminder }) {
  const { pathname } = useLocation();
  const themed = isThemed(pathname);
  return (
    <div className="ht-themed flex min-h-screen bg-ht-bg text-ht-text">
      <SkipLink />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <UtilityBar />
        <SimulatedBanner />
        <TopBar />
        <main id="main" tabIndex={-1} className="flex-1 p-6">
          <div className="mx-auto w-full max-w-6xl">
            <OfflineBanner />
            {reminder}
            <Breadcrumb />
            {themed ? children : <div className="ht-legacy mx-auto max-w-2xl rounded-2xl bg-slate-50 p-5 shadow-lift">{children}</div>}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
