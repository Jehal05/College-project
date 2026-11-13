// Beep and vibrate helpers for the countdown. Browsers only allow sound after a tap,
// so call unlock() inside a click handler (the "Get help now" button does this).
let audio = null;
let muted = false; // the person's choice on the safety check-in screen; applies to sound and vibration
export const isMuted = () => muted;
export const setMuted = (value) => { muted = value; };

function context() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audio) audio = new AudioCtx();
  return audio;
}

export function unlock() {
  try {
    const ctx = context();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch {
    /* sound is optional */
  }
}

// One short 880 Hz tone.
export function beep() {
  if (muted) return;
  try {
    const ctx = context();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* sound is optional */
  }
}

export function vibrate(ms = 200) {
  if (muted) return;
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* vibration is optional */
  }
}

// Free the audio device when the countdown screen closes.
export function stopAlarm() {
  try {
    if (audio) audio.close();
  } catch {
    /* ignore */
  }
  audio = null;
}
