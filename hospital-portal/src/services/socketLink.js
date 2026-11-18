// One live link with reconnecting, kept free of the browser so it can be tested with a fake WebSocket and fake timers.
// Rules: wait 2 s, 4 s, 8 s ... up to 30 s between tries; start again from 2 s only after a socket stayed open for
// STABLE_MS (so a server that accepts and then closes straight away is not hit every 2 s); never retry after code 1008
// (the login is dead, so the status becomes 'signed_out' and the desk has to log in again).
import { reconnectDelay, STABLE_MS, POLICY_CLOSE } from './backoff.js';

export function createLink({ makeSocket, onOpen, onMessage, onStatus,
  setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now, random = Math.random }) {
  let socket = null;
  let timer = null;
  let wanted = false;
  let attempt = 0;
  let openedAt = null;

  function schedule() {
    onStatus('reconnecting');
    clearTimer(timer);
    timer = setTimer(() => wanted && start(), reconnectDelay(attempt++, random));
  }

  function start() {
    wanted = true;
    if (socket) return;
    let s;
    try {
      s = makeSocket();
    } catch (err) {
      console.warn('WebSocket could not start', err);
      return schedule();
    }
    socket = s;
    s.onopen = () => {
      openedAt = now();
      onOpen?.(s);
      onStatus('live');
    };
    s.onmessage = (e) => onMessage?.(e);
    // No detail is logged: the address holds the token.
    s.onerror = () => {
      if (wanted && socket === s) onStatus('reconnecting');
    };
    s.onclose = (e) => {
      if (socket === s) socket = null;
      const stayed = openedAt === null ? 0 : now() - openedAt;
      openedAt = null;
      if (!wanted) return;
      if (e && e.code === POLICY_CLOSE) {
        wanted = false;
        attempt = 0;
        clearTimer(timer);
        return onStatus('signed_out');
      }
      if (stayed >= STABLE_MS) attempt = 0;
      schedule();
    };
  }

  function stop(idleStatus) {
    wanted = false;
    attempt = 0;
    openedAt = null;
    clearTimer(timer);
    if (socket) {
      const s = socket;
      socket = null;
      s.close();
    }
    onStatus(idleStatus);
  }

  return { start, stop };
}
