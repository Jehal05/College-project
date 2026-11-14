import { setPresenting } from '../services/presentation.js';
import { usePresenting } from './usePresenting.js';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import { useState } from 'react';
import SimulatedBadge from './SimulatedBadge.jsx';
import { USE_MOCK } from '../services/config.js';
import { resetDemo } from '../services/demoReset.js';
import { useHospitals } from './HospitalProvider.jsx';
import { useT } from '../i18n/index.js';
import { roleText } from '../i18n/phrases.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import SoundControl from './SoundControl.jsx';

const links = [
  { to: '/dashboard', label: 'nav.dashboard' },
  { to: '/map', label: 'nav.map' },
  { to: '/fleet', label: 'nav.fleet' },
  { to: '/history', label: 'nav.history' },
  { to: '/activity', label: 'nav.activity' },
  { to: '/handover', label: 'nav.handover' },
  { to: '/analytics', label: 'nav.analytics' },
  { to: '/admin', label: 'nav.admin', adminOnly: true },
];

export default function NavBar() {
  const t = useT();
  const presenting = usePresenting();
  const { session, role, logout, chooseHospital } = useAuth();
  const { hospitals } = useHospitals();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <header className="bg-slate-900 text-white">
      <div className="flex flex-wrap items-center gap-4 px-6 py-3">
        <span className="text-xl font-bold">{t('app.title')}</span>
        <SimulatedBadge text={t('app.simulated')} />
        <nav className="flex gap-1 ml-4">
          {links
            .filter((l) => !l.adminOnly || role === 'admin')
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 font-medium ${isActive ? 'bg-white text-slate-900' : 'hover:bg-slate-700'}`
                }
              >
                {t(l.label)}
              </NavLink>
            ))}
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
