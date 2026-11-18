// Live sharing during an open alert: the phone's real GPS position and (if a Bluetooth strap is connected) its real heart rate go to the
// hospital screen about every 2 seconds. Only with the matching consent, and only until the person taps "Stop sharing".
// Pure of React. The browser objects are passed in, so the tests use fakes and need no GPS or Bluetooth.
export const SEND_EVERY_MS = 2000;
export const POSITION_STALE_MS = 20000; // an old position is not sent as if it were current
export const OPEN_STATES = ['SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED'];

/** The body to send now, or null when there is nothing fresh and allowed to send. */
export function buildUpdate({ position, bpm, locationOn, heartOn, now = Date.now() }) {
  const body = {};
  if (locationOn && position && Number.isFinite(position.lat) && Number.isFinite(position.lng) && now - position.at <= POSITION_STALE_MS) {
    body.lat = position.lat; body.lng = position.lng;
    if (Number.isFinite(position.accuracy)) body.accuracy = position.accuracy;
  }
  if (heartOn && Number.isFinite(bpm)) body.heart_rate = bpm;
  return Object.keys(body).length ? body : null;
}

/**
 * createLiveShare({ post, geolocation, getBpm, locationOn, heartOn, onStatus })
 * status: idle | sharing | waiting | denied | ended | error
 */
export function createLiveShare({ post, geolocation, getBpm = () => null, locationOn, heartOn, onStatus = () => {}, every = SEND_EVERY_MS, now = Date.now, setTimer = setInterval, clearTimer = clearInterval }) {
  let position = null, watchId = null, timer = null, running = false, denied = false, busy = false; // busy: one request at a time, never a pile-up on a slow network

  const tick = () => {
    const body = buildUpdate({ position, bpm: getBpm(), locationOn, heartOn, now: now() });
    if (!body) { onStatus(denied ? 'denied' : 'waiting'); return; }
    if (busy) return;
    busy = true;
    post(body).then(() => { busy = false; if (running) onStatus('sharing'); }).catch((err) => {
      busy = false;
      if (err && err.status === 409) { stop(); onStatus('ended'); } else if (running) onStatus('error'); // 409: the alert is closed
    });
  };

  function start() {
    if (running) return;
    running = true; onStatus('waiting');
    if (locationOn && geolocation && typeof geolocation.watchPosition === 'function') {
      watchId = geolocation.watchPosition(
        (p) => { denied = false; position = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: now() }; },
        (e) => { if (e && e.code === 1) denied = true; },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    }
    timer = setTimer(tick, every);
  }
  function stop() {
    running = false;
    if (timer !== null) clearTimer(timer);
    if (watchId !== null && geolocation && typeof geolocation.clearWatch === 'function') geolocation.clearWatch(watchId);
    timer = null; watchId = null;
  }
  return { start, stop, tick };
}
