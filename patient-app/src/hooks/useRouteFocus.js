// After a page change, move keyboard and screen-reader focus to the page heading (or the content area).
// If the heading is not there yet (the page is still loading), wait up to 2 seconds for it.
import { useEffect, useRef } from 'react';

export default function useRouteFocus(pathname) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; } // do not steal focus on the first load
    const main = document.getElementById('main');
    if (!main) return undefined;
    const focusHeading = () => {
      const heading = main.querySelector('h1');
      if (!heading) return false;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return undefined;
    main.focus({ preventScroll: true });
    const watcher = new MutationObserver(() => { if (focusHeading()) watcher.disconnect(); });
    watcher.observe(main, { childList: true, subtree: true });
    const giveUp = setTimeout(() => watcher.disconnect(), 2000);
    return () => { watcher.disconnect(); clearTimeout(giveUp); };
  }, [pathname]);
}
