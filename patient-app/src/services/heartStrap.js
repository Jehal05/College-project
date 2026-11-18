// Heart rate from a Bluetooth chest strap (Web Bluetooth, standard Heart Rate service). Runs only in the browser, only after the person
// taps "Connect" and the vitals consent is on. The reading stays on this phone: it is shown, labelled "Device", and is NOT sent anywhere
// by this file. Pure of React; the Bluetooth object is passed in so tests use a fake one and need no hardware.
export const HR_SERVICE = 'heart_rate';
export const HR_CHARACTERISTIC = 'heart_rate_measurement';
export const MIN_BPM = 20;
export const MAX_BPM = 250;
export const STALE_AFTER_MS = 6000; // no reading for this long: the card stops showing the old number as live
export const MAX_RECONNECTS = 3;

/** Beats per minute from a Heart Rate Measurement value (Bluetooth spec: bit 0 of the flags = 16-bit value). Null if not usable. */
export function parseHeartRate(view) {
  if (!view || typeof view.byteLength !== 'number' || view.byteLength < 2) return null;
  const sixteen = (view.getUint8(0) & 0x01) === 1;
  if (sixteen && view.byteLength < 3) return null;
  const bpm = sixteen ? view.getUint16(1, true) : view.getUint8(1);
  return Number.isFinite(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM ? bpm : null; // 0 (no contact) and nonsense are ignored
}

export const strapSupported = (nav = typeof navigator === 'undefined' ? undefined : navigator) => Boolean(nav && nav.bluetooth && typeof nav.bluetooth.requestDevice === 'function');

/**
 * createStrap({ bluetooth, onReading(bpm, at), onState(state), now })
 * states: idle | connecting | connected | reconnecting | lost | error | unsupported | cancelled
 * Returns { connect(), disconnect() }.
 */
export function createStrap({ bluetooth, onReading, onState, now = Date.now, wait = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  let device = null;
  let characteristic = null;
  let wanted = false; // the person has not pressed Disconnect
  let reconnects = 0;

  const handleValue = (e) => {
    const bpm = parseHeartRate(e && e.target && e.target.value);
    if (bpm !== null) onReading(bpm, now());
  };

  async function open() {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(HR_SERVICE);
    if (characteristic) characteristic.removeEventListener('characteristicvaluechanged', handleValue); // after a reconnect: never listen twice
    characteristic = await service.getCharacteristic(HR_CHARACTERISTIC);
    characteristic.removeEventListener('characteristicvaluechanged', handleValue);
    characteristic.addEventListener('characteristicvaluechanged', handleValue);
    await characteristic.startNotifications();
  }

  async function onDropped() {
    if (!wanted) return;
    while (wanted && reconnects < MAX_RECONNECTS) {
      reconnects += 1;
      onState('reconnecting');
      await wait(1000 * reconnects);
      try { await open(); reconnects = 0; onState('connected'); return; } catch { /* try again */ }
    }
    if (wanted) onState('lost');
  }

  return {
    async connect() {
      if (!bluetooth || typeof bluetooth.requestDevice !== 'function') { onState('unsupported'); return; }
      wanted = true;
      reconnects = 0;
      onState('connecting');
      try {
        device = await bluetooth.requestDevice({ filters: [{ services: [HR_SERVICE] }] }); // the browser shows its own device picker
        device.addEventListener('gattserverdisconnected', onDropped);
        await open();
        onState('connected');
      } catch (err) {
        wanted = false;
        onState(err && err.name === 'NotFoundError' ? 'cancelled' : 'error'); // NotFoundError = the person closed the picker
      }
    },
    disconnect() {
      wanted = false;
      try { if (characteristic) { characteristic.removeEventListener('characteristicvaluechanged', handleValue); characteristic.stopNotifications().catch(() => {}); } } catch { /* already gone */ }
      try { if (device && device.gatt && device.gatt.connected) device.gatt.disconnect(); } catch { /* already gone */ }
      characteristic = null;
      onState('idle');
    },
  };
}

/** Is a reading still fresh enough to show as the current heart rate? */
export const isFresh = (at, nowMs = Date.now()) => typeof at === 'number' && nowMs - at <= STALE_AFTER_MS;
