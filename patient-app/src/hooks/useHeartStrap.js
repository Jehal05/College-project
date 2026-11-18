// The chest strap for a component: { status, bpm, at, fresh, connect, disconnect, supported }.
// Connecting is refused unless the vitals consent is on. Turning that consent off disconnects at once.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createStrap, isFresh, strapSupported } from '../services/heartStrap';

export default function useHeartStrap(consentOn, bluetooth = typeof navigator === 'undefined' ? undefined : navigator.bluetooth) {
  const [status, setStatus] = useState(strapSupported({ bluetooth }) ? 'idle' : 'unsupported');
  const [reading, setReading] = useState(null); // { bpm, at }
  const [tick, setTick] = useState(0);
  const strap = useRef(null);

  const connect = useCallback(async () => {
    if (!consentOn) return;
    if (!strap.current) strap.current = createStrap({ bluetooth, onReading: (bpm, at) => setReading({ bpm, at }), onState: setStatus });
    await strap.current.connect();
  }, [consentOn, bluetooth]);
  const disconnect = useCallback(() => { if (strap.current) strap.current.disconnect(); setReading(null); }, []);

  useEffect(() => { if (!consentOn && strap.current) disconnect(); }, [consentOn, disconnect]);
  useEffect(() => () => { if (strap.current) strap.current.disconnect(); }, []);
  useEffect(() => { // re-check freshness once a second so an old number is not shown as live
    if (status !== 'connected' && status !== 'reconnecting') return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const fresh = Boolean(reading) && isFresh(reading.at) && (status === 'connected' || status === 'reconnecting') && tick >= 0;
  return { status, bpm: fresh ? reading.bpm : null, at: reading ? reading.at : null, fresh, connect, disconnect, supported: status !== 'unsupported' };
}
