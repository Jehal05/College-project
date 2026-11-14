// Safety check-in state ("Are you OK?"), shared by the screen overlay, the inactivity watcher and the demo panel.
// Kept in memory only. source is FALL_CHECK (the "Simulated fall" button) or INACTIVITY_CHECK (the idle timer).
import { useSyncExternalStore } from 'react';

let active = null; // { source } while the check-in is on screen
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function startCheckIn(source) { if (!active) { active = { source }; notify(); } }
export function endCheckIn() { if (active) { active = null; notify(); } }
export const useCheckIn = () => useSyncExternalStore(subscribe, () => active);
