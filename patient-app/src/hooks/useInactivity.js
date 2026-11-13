// Calls onIdle() after `minutes` without a touch, key or pointer action, but only while the app is open and visible.
// A hidden tab restarts the timer, so coming back never triggers it at once. It lives in memory only.
import { useEffect, useRef } from 'react';

const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];

export default function useInactivity(enabled, minutes, onIdle) {
  const callback = useRef(onIdle);
  callback.current = onIdle;
  useEffect(() => {
    if (!enabled) return undefined;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    ACTIVITY.forEach((name) => window.addEventListener(name, bump, { passive: true }));
    document.addEventListener('visibilitychange', bump);
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') { last = Date.now(); return; }
      if (Date.now() - last >= minutes * 60000) { last = Date.now(); callback.current(); }
    }, 1000);
    return () => {
      clearInterval(timer);
      ACTIVITY.forEach((name) => window.removeEventListener(name, bump));
      document.removeEventListener('visibilitychange', bump);
    };
  }, [enabled, minutes]);
}
