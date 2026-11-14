// Replay of the readings kept in memory (the last minute). `index` is the reading being shown; `live` means "follow the newest".
import { useEffect, useState } from 'react';

export default function useReplay(length, speedMs = 400) {
  const [index, setIndex] = useState(null); // null = live
  const [playing, setPlaying] = useState(false);
  const last = Math.max(0, length - 1);
  const shown = index === null ? last : Math.min(index, last);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = (i === null ? 0 : i) + 1;
        if (next >= last) { setPlaying(false); return null; } // reached the newest: back to live
        return next;
      });
    }, speedMs);
    return () => clearInterval(timer);
  }, [playing, last, speedMs]);

  return {
    shown, live: index === null, playing,
    seek: (i) => { setPlaying(false); setIndex(Number(i) >= last ? null : Number(i)); },
    play: () => { if (last > 0) { setIndex((i) => (i === null ? 0 : i)); setPlaying(true); } },
    pause: () => setPlaying(false),
    goLive: () => { setPlaying(false); setIndex(null); },
  };
}
