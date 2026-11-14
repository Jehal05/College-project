// Counts down once per second from "initial" and calls onTick(secondsLeft) and finally onDone().
// skip() jumps straight to 0 ("Send now").
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useCountdown(initial, { onTick, onDone }) {
  const [remaining, setRemaining] = useState(initial);
  const callbacks = useRef({ onTick, onDone });
  callbacks.current = { onTick, onDone }; // always call the latest functions

  // Lower the number every second until it reaches 0.
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id); // stop when the screen closes
  }, []);

  // React to each new number: beep while counting, finish at 0.
  useEffect(() => {
    if (remaining <= 0) callbacks.current.onDone();
    else callbacks.current.onTick(remaining);
  }, [remaining]);

  const skip = useCallback(() => setRemaining(0), []);
  return { remaining, skip };
}
