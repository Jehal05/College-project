// Visible banner when alert sound is switched on but the browser still blocks it (no click on the page yet).
// One click on the banner unlocks the sound. Without this, a blocked sound would fail silently in a demo.
import { useSyncExternalStore } from 'react';
import { getSoundStatus, subscribeSound, unlockSound } from '../services/sound.js';
import { showSoundBanner } from '../services/soundState.js';
import { useT } from '../i18n/index.js';

export default function SoundBanner() {
  const t = useT();
  const status = useSyncExternalStore(subscribeSound, getSoundStatus);
  if (!showSoundBanner(status)) return null;
  return (
    <button
      type="button"
      role="alert"
      data-testid="sound-banner"
      onClick={() => unlockSound()}
      className="w-full border-b-2 border-amber-600 bg-amber-50 px-6 py-2 text-left text-lg font-semibold text-amber-900 hover:bg-amber-100"
    >
      🔇 {t('sound.blocked')}
    </button>
  );
}
