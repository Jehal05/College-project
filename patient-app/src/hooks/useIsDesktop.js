// True on screens at least 1024 px wide (the sidebar layout). Below that the phone layout is used.
import { useEffect, useState } from 'react';

const QUERY = '(min-width: 1024px)';
const now = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

export default function useIsDesktop() {
  const [yes, setYes] = useState(now);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const m = window.matchMedia(QUERY);
    const on = () => setYes(m.matches);
    m.addEventListener('change', on); on();
    return () => m.removeEventListener('change', on);
  }, []);
  return yes;
}
