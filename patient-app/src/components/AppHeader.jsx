// Top bar of the normal (non-emergency) screens: brand mark, app name and a small status chip (Online / Offline / Demo).
import { useTranslation } from 'react-i18next';
import { LogoMark } from './icons';
import { Chip } from './ui/Feedback';
import useOnline from '../hooks/useOnline';
import { DEMO_ENABLED } from '../config/demo';

export default function AppHeader() {
  const { t } = useTranslation();
  const online = useOnline();
  return (
    <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <LogoMark size={32} />
        <p className="truncate text-lg font-extrabold tracking-tight text-brand-900">{t('app.title')}</p>
      </div>
      <div className="flex items-center gap-1">
        {DEMO_ENABLED && <Chip tone="brand">{t('status.demo')}</Chip>}
        <Chip tone={online ? 'success' : 'warning'} icon={online ? 'check' : 'alert'}>{online ? t('status.online') : t('status.offline')}</Chip>
      </div>
    </header>
  );
}
