import { setPresenting } from '../services/presentation.js';
import { usePresenting } from './usePresenting.js';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import { useEffect, useRef, useState } from 'react';
import { visibleGroups } from '../services/navGroups.js';
import SimulatedBadge from './SimulatedBadge.jsx';
import { USE_MOCK } from '../services/config.js';
import { resetDemo } from '../services/demoReset.js';
import { useHospitals } from './HospitalProvider.jsx';
import { useT } from '../i18n/index.js';
import { roleText } from '../i18n/phrases.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import SoundControl from './SoundControl.jsx';

export default function NavBar() {
  const t = useT();
  const presenting = usePresenting();
  const { session, role, logout, chooseHospital } = useAuth();
  const { hospitals } = useHospitals();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // small screens only: the menu is folded behind a button
  const menuButton = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]); // choosing a page closes the menu

  // Escape closes the small-screen menu and puts focus back on its button.
  function onMenuKeyDown(e) {
    if (e.key === 'Escape' && menuOpen) {
      setMenuOpen(false);
      menuButton.current?.focus();
    }
  }

  return (
    <header className="border-b-4 border-ht-accent bg-ht-sidebar text-white">
      <div className="flex flex-wrap items-center gap-4 px-6 py-3">
        <span className="flex items-center gap-2 text-xl font-bold">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-ht-accent2 text-ht-sidebar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.3 5c1.9 0 3.4 1 4.4 2.5.4.5 1.2.5 1.6 0C13.3 6 14.8 5 16.7 5 20 5 22.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" /></svg>
          </span>
          {t('app.title')}
        </span>
        <SimulatedBadge text={t('app.simulated')} />
        <nav aria-label={t('nav.aria')} onKeyDown={onMenuKeyDown} className="ml-4">
          <button
            ref={menuButton}
            type="button"
            data-testid="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="min-h-11 rounded-lg border border-slate-400 px-4 py-1.5 font-semibold md:hidden"
          >
            {menuOpen ? t('nav.menuClose') : t('nav.menu')}
          </button>
          <div id="site-menu" className={`${menuOpen ? 'mt-2 flex' : 'hidden'} flex-col gap-3 md:mt-0 md:flex md:flex-row md:items-start md:gap-5`}>
            {visibleGroups(role).map((g) => (
              <div key={g.id} role="group" aria-labelledby={`nav-g-${g.id}`}>
                <div id={`nav-g-${g.id}`} className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-300">{t(g.label)}</div>
                <div className="flex flex-col gap-1 md:flex-row">
                  {g.links.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      className={({ isActive }) =>
                        `inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 ${isActive ? 'bg-ht-accent font-bold text-ht-sidebar underline decoration-2 underline-offset-4' : 'font-medium hover:bg-ht-card'}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span aria-hidden="true" className="mr-1">▸</span>}
                          {t(l.label)}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {USE_MOCK && !presenting && !confirmReset && (
            <button data-testid="reset-demo" onClick={() => setConfirmReset(true)} className="rounded-lg border border-amber-400 px-3 py-1.5 text-amber-200 hover:bg-slate-700">
              {t('nav.resetDemo')}
            </button>
          )}
          {USE_MOCK && !presenting && confirmReset && (
            <span data-testid="reset-confirm" className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1 text-slate-900">
              {t('nav.resetAsk')}
              <button data-testid="reset-yes" onClick={resetDemo} className="rounded bg-red-600 px-3 py-1 font-bold text-white">{t('nav.resetYes')}</button>
              <button data-testid="reset-no" onClick={() => setConfirmReset(false)} className="rounded bg-slate-300 px-3 py-1 font-semibold">{t('nav.resetNo')}</button>
            </span>
          )}
          {session?.hospital_from_login === false && hospitals.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              {t('nav.deskHospital')}
              <select data-testid="desk-hospital" value={session.hospital_id || ''} onChange={(e) => chooseHospital(e.target.value)} className="rounded bg-slate-800 px-2 py-1 text-white">
                {hospitals.filter((h) => h.verified).map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
          )}
          <button data-testid="presentation-toggle" aria-pressed={presenting} onClick={() => setPresenting(!presenting)} title={t('present.hint')} className={`rounded-lg border px-3 py-1.5 font-semibold ${presenting ? 'border-sky-300 bg-sky-200 text-slate-900' : 'border-slate-500 text-slate-200 hover:bg-slate-700'}`}>
            {presenting ? t('present.on') : t('present.off')}
          </button>
          <SoundControl />
          <LanguageSwitcher />
          <span className="text-slate-300">
            {session?.name} ({roleText(t, role)})
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-lg bg-slate-700 px-3 py-1.5 hover:bg-slate-600"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
