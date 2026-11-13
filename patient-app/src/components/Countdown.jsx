// EMPTY SHELL. Phase 2 (cancel flow) adds the real timer, alarm sound and vibration.
// For now it only shows the number of seconds it is given.
import { useTranslation } from 'react-i18next';

export default function Countdown({ seconds = 0 }) {
  const { t } = useTranslation();
  return (
    <div role="timer" aria-label={t('countdown.seconds', { count: seconds })} className="text-center text-5xl font-bold">
      {seconds}
    </div>
  );
}
