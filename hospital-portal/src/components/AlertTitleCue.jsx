// Non-sound cue for a new alert: the browser tab title blinks for a few seconds (and keeps the unread count).
// Renders nothing. Works even when the sound is blocked or off.
import { useEffect, useRef } from 'react';
import { useEmergencies } from './EmergencyProvider.jsx';
import { useT } from '../i18n/index.js';
import { isNewAlert, titleFrame } from '../services/soundState.js';

const BLINKS = 8;
const EVERY_MS = 800;

export default function AlertTitleCue() {
  const t = useT();
  const { unreadCount } = useEmergencies();
  const base = useRef(typeof document !== 'undefined' ? document.title.replace(/^\(\d+\)\s+(NEW ALERT · )?/, '') : '');
  const prev = useRef(unreadCount);
  const timer = useRef(null);
  const label = t('sound.cueTitle');

  useEffect(() => {
    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    const show = (on) => { document.title = titleFrame(base.current, unreadCount, on, label); };
    if (isNewAlert(prev.current, unreadCount)) {
      stop();
      let n = 0;
      show(true);
      timer.current = setInterval(() => {
        n += 1;
        if (n >= BLINKS) { stop(); show(false); return; }
        show(n % 2 === 0);
      }, EVERY_MS);
    } else if (!timer.current) {
      show(false);
    }
    prev.current = unreadCount;
    return undefined;
  }, [unreadCount, label]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  return null;
}
