// Always-visible "Call 112 / 108" button. It is a plain tel: link, so it works even if the server is down.
// onRed = true when the button sits on the red emergency background.
import { useTranslation } from 'react-i18next';
import Icon from './icons';

export default function CallButton({ onRed = false }) {
  const { t } = useTranslation();
  const colours = onRed ? 'bg-white text-red-800 ring-2 ring-red-900' : 'bg-red-700 text-white hover:bg-red-800';
  return (
    <a href="tel:112" className={'sticky top-10 z-10 flex min-h-[64px] w-full items-center justify-center gap-3 rounded-xl text-xl font-bold shadow-lift ' + colours}>
      <Icon name="phone" size={26} />{t('emergency.call')}
    </a>
  );
}
