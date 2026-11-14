// Top bar of the desktop layout: record search, device status, notifications, language, theme and profile menu.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '../icons';
import NotificationBell from '../NotificationBell';
import StatusChip from '../ui/StatusChip';
import { LANGUAGES, setLanguage } from '../../i18n';
import { updatePatient } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import useOnline from '../../hooks/useOnline';
import useTheme from '../../hooks/useTheme';

const field = 'min-h-[44px] rounded-xl border border-ht-line bg-ht-card px-3 text-sm text-ht-text';

function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  async function change(e) {
    const code = e.target.value;
    await setLanguage(code);
    if (session) updatePatient(session.patient_id, { language: code }).catch(() => {}); // the choice still applies on this device
  }
  return (
    <select aria-label={t('topbar.language')} value={i18n.language} onChange={change} className={field}>
      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}

function ProfileMenu() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} aria-controls="profile-menu" aria-label={t('topbar.profile')} onClick={() => setOpen(!open)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-ht-line bg-ht-card text-ht-text">
        <Icon name="user" />
      </button>
      {open && (
        <div id="profile-menu" role="group" aria-label={t('topbar.profile')} className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-ht-line bg-ht-card p-2 shadow-lift">
          <button type="button" onClick={() => { setOpen(false); navigate('/profile'); }} className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-ht-text hover:bg-ht-bg">
            <Icon name="user" size={18} />{t('nav.profile')}
          </button>
          <button type="button" onClick={signOut} className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-ht-text hover:bg-ht-bg">
            <Icon name="logout" size={18} />{t('home.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const { t } = useTranslation();
  const online = useOnline();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState('');
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-ht-line bg-ht-bg px-6 py-3">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-[200px] flex-1">
        <label className="sr-only" htmlFor="record-search">{t('topbar.search')}</label>
        <input id="record-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('topbar.search')} className={field + ' w-full max-w-md placeholder:text-ht-muted'} />
      </form>
      <StatusChip tone="info" icon="activity">{t('topbar.device')}</StatusChip>
      <StatusChip tone={online ? 'ok' : 'caution'}>{online ? t('status.online') : t('status.offline')}</StatusChip>
      <button type="button" onClick={toggle} aria-pressed={theme === 'dark'} className={field + ' font-semibold'}>
        {theme === 'dark' ? t('topbar.themeLight') : t('topbar.themeDark')}
      </button>
      <LanguageMenu />
      <NotificationBell />
      <ProfileMenu />
    </header>
  );
}
