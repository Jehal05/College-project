// Short two-tone alert sound made with Web Audio (no audio file needed).
// Browsers only allow sound after the user has clicked something on the page. The NavBar sound control shows
// that state ("tap to enable") and a first click anywhere on the page unlocks it. The on/off choice is saved.
import { SOUND_KEY, parseEnabled, serializeEnabled, soundStatus, shouldPlay } from './soundState.js';

let ctx = null;
let enabled = readEnabled();
let status = null;
const listeners = new Set();

function readEnabled() {
  try {
    return parseEnabled(localStorage.getItem(SOUND_KEY));
  } catch {
    return true; // storage blocked: default on
  }
}
const ctxState = () => (ctx ? ctx.state : null);
function compute() {
  return soundStatus(enabled, ctxState());
}
function refresh() {
  const next = compute();
  if (next === status) return;
  status = next;
  listeners.forEach((cb) => cb());
}

// Subscribe for useSyncExternalStore.
export const subscribeSound = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export const getSoundStatus = () => {
  if (status === null) status = compute();
  return status;
};

function makeContext() {
  const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) return null;
  ctx = ctx || new AudioCtx();
  ctx.onstatechange = refresh;
  return ctx;
}

/** Call from a click: creates the audio context and resumes it, so later alerts can be heard. */
export async function unlockSound() {
  try {
    const c = makeContext();
    if (c && c.state === 'suspended') await c.resume();
  } catch (err) {
    console.warn('Sound could not be switched on', err);
  }
  refresh();
}

export function setSoundEnabled(on) {
  enabled = Boolean(on);
  try {
    localStorage.setItem(SOUND_KEY, serializeEnabled(enabled));
  } catch {
    /* not saved, still applied */
  }
  if (enabled) unlockSound(); // the click that switched it on unlocks the browser
  refresh();
}

// The very first click or key press anywhere on the page unlocks sound (if it is switched on).
if (typeof window !== 'undefined') {
  const once = () => {
    window.removeEventListener('pointerdown', once, true);
    window.removeEventListener('keydown', once, true);
    if (enabled) unlockSound();
  };
  window.addEventListener('pointerdown', once, true);
  window.addEventListener('keydown', once, true);
}

function beep() {
  [880, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + i * 0.22;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.21);
  });
}

/** A new alert: plays only when sound is switched on and the browser has allowed it. */
export function playAlertSound() {
  try {
    if (!shouldPlay(enabled, ctxState())) {
      if (enabled && ctxState() !== 'running') makeContext()?.resume?.().then(refresh).catch(() => {}); // try once; may stay blocked
      return;
    }
    beep();
  } catch (err) {
    console.warn('Alert sound could not play', err);
  }
}

/** The "Test sound" button: always tries (a click unlocks it), even if the desk had it off. */
export async function playTestSound() {
  try {
    await unlockSound();
    if (ctxState() === 'running') beep();
  } catch (err) {
    console.warn('Test sound could not play', err);
  }
}
