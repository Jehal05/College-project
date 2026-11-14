// Sound control in the NavBar: shows whether alert sounds will really be heard, and lets the desk test them.
// off = switched off · needs-click = switched on but the browser still blocks it · on = will play.
import { useSyncExternalStore } from 'react';
import { getSoundStatus, playTestSound, setSoundEnabled, subscribeSound, unlockSound } from '../services/sound.js';
import { useT } from '../i18n/index.js';

export default function SoundControl() {
  const t = useT();
  const status = useSyncExternalStore(subscribeSound, getSoundStatus);
  const label = status === 'on' ? t('sound.on') : status === 'off' ? t('sound.off') : t('sound.tap');
  const style = status === 'on' ? 'border-emerald-400 text-emerald-200' : status === 'off' ? 'border-slate-500 text-slate-300' : 'border-amber-400 text-amber-200';
  return (
    <span className="flex items-center gap-1" data-testid="sound-control" data-status={status}>
      <button
        data-testid="sound-toggle"
        onClick={() => (status === 'needs-click' ? unlockSound() : setSoundEnabled(status === 'off'))}
        aria-pressed={status !== 'off'}
        title={status === 'needs-click' ? t('sound.tapHelp') : ''}
        className={`rounded-lg border px-3 py-1.5 hover:bg-slate-700 ${style}`}
      >
        <span aria-hidden="true">{status === 'off' ? '🔇' : '🔊'} </span>
        {label}
      </button>
      <button data-testid="sound-test" onClick={playTestSound} className="rounded-lg border border-slate-500 px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-700">
        {t('sound.test')}
      </button>
    </span>
  );
}
