// Gives a component the latest live vitals and whether the connection is up.
import { useEffect, useState } from 'react';
import { connectEvents } from '../services/socket';

export default function useVitals() {
  const [vitals, setVitals] = useState(null); // { heart_rate, spo2, timestamp, state }
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const stop = connectEvents((event) => {
      if (event.type === 'vitals.update') {
        setVitals({ ...event.payload, timestamp: event.timestamp, state: event.state });
      }
    }, setConnected);
    return stop; // Close the connection when the screen is left.
  }, []);

  return { vitals, connected };
}
