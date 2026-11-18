// The chest strap logic with a FAKE Bluetooth device: no hardware, no browser. Run by vitest.
import { describe, it, expect, vi } from 'vitest';
import { parseHeartRate, createStrap, isFresh, strapSupported, STALE_AFTER_MS, MAX_RECONNECTS } from '../../src/services/heartStrap';

const view = (...bytes) => new DataView(new Uint8Array(bytes).buffer);

describe('parseHeartRate (Bluetooth Heart Rate Measurement)', () => {
  it('reads an 8-bit value', () => expect(parseHeartRate(view(0x00, 72))).toBe(72));
  it('a 16-bit value above the allowed range is ignored', () => expect(parseHeartRate(view(0x01, 0x2c, 0x01))).toBeNull()); // 300 bpm is out of range
  it('reads a 16-bit value in range', () => expect(parseHeartRate(view(0x01, 0x96, 0x00))).toBe(150));
  it('ignores 0 (no skin contact) and impossible values', () => {
    expect(parseHeartRate(view(0x00, 0))).toBeNull();
    expect(parseHeartRate(view(0x00, 255))).toBeNull();
    expect(parseHeartRate(view(0x00, 10))).toBeNull();
  });
  it('ignores short or missing data', () => {
    expect(parseHeartRate(null)).toBeNull();
    expect(parseHeartRate(view(0x00))).toBeNull();
    expect(parseHeartRate(view(0x01, 0x50))).toBeNull();
  });
});

// A fake strap: lets a test push values, drop the link and refuse to come back.
function fakeBluetooth({ failOpens = 0, pickerCancelled = false } = {}) {
  const char = { _l: [], addEventListener(n, f) { this._l.push(f); }, removeEventListener(n, f) { this._l = this._l.filter((x) => x !== f); }, startNotifications: vi.fn(async () => {}), stopNotifications: vi.fn(async () => {}) };
  const dev = { _d: [], addEventListener(n, f) { this._d.push(f); }, gatt: { connected: false, disconnect: vi.fn(function d() { this.connected = false; }) } };
  let opens = 0;
  dev.gatt.connect = vi.fn(async () => { opens += 1; if (opens > 1 && failOpens > 0) { failOpens -= 1; throw new Error('gone'); } dev.gatt.connected = true; return { getPrimaryService: async () => ({ getCharacteristic: async () => char }) }; });
  const bluetooth = { requestDevice: vi.fn(async () => { if (pickerCancelled) { const e = new Error('closed'); e.name = 'NotFoundError'; throw e; } return dev; }) };
  return { bluetooth, push: (...b) => char._l.forEach((f) => f({ target: { value: view(...b) } })), drop: () => dev._d.forEach((f) => f()), char, dev };
}
const noWait = () => Promise.resolve();

describe('createStrap', () => {
  it('connects, then reports each good reading and ignores bad ones', async () => {
    const f = fakeBluetooth(); const readings = []; const states = [];
    const s = createStrap({ bluetooth: f.bluetooth, onReading: (b) => readings.push(b), onState: (x) => states.push(x), wait: noWait });
    await s.connect();
    f.push(0x00, 80); f.push(0x00, 0); f.push(0x00, 81);
    expect(states).toEqual(['connecting', 'connected']);
    expect(readings).toEqual([80, 81]);
    expect(f.bluetooth.requestDevice).toHaveBeenCalledWith({ filters: [{ services: ['heart_rate'] }] });
  });
  it('a closed device picker is "cancelled", not an error', async () => {
    const states = [];
    await createStrap({ bluetooth: fakeBluetooth({ pickerCancelled: true }).bluetooth, onReading: () => {}, onState: (x) => states.push(x), wait: noWait }).connect();
    expect(states.at(-1)).toBe('cancelled');
  });
  it('no Bluetooth in this browser: "unsupported"', async () => {
    const states = [];
    await createStrap({ bluetooth: undefined, onReading: () => {}, onState: (x) => states.push(x) }).connect();
    expect(states).toEqual(['unsupported']);
    expect(strapSupported({})).toBe(false);
    expect(strapSupported({ bluetooth: { requestDevice() {} } })).toBe(true);
  });
  it('a dropped link reconnects by itself and carries on', async () => {
    const f = fakeBluetooth(); const states = []; const readings = [];
    const s = createStrap({ bluetooth: f.bluetooth, onReading: (b) => readings.push(b), onState: (x) => states.push(x), wait: noWait });
    await s.connect();
    f.drop();
    await new Promise((r) => setTimeout(r, 0));
    f.push(0x00, 90);
    expect(states).toEqual(['connecting', 'connected', 'reconnecting', 'connected']);
    expect(readings).toEqual([90]);
  });
  it('gives up after the allowed reconnect tries and says "lost"', async () => {
    const f = fakeBluetooth({ failOpens: 99 }); const states = [];
    const s = createStrap({ bluetooth: f.bluetooth, onReading: () => {}, onState: (x) => states.push(x), wait: noWait });
    await s.connect();
    f.drop();
    await new Promise((r) => setTimeout(r, 0));
    expect(states.filter((x) => x === 'reconnecting')).toHaveLength(MAX_RECONNECTS);
    expect(states.at(-1)).toBe('lost');
  });
  it('Disconnect stops the readings, the notifications and the link, and does not reconnect', async () => {
    const f = fakeBluetooth(); const readings = []; const states = [];
    const s = createStrap({ bluetooth: f.bluetooth, onReading: (b) => readings.push(b), onState: (x) => states.push(x), wait: noWait });
    await s.connect();
    s.disconnect();
    f.push(0x00, 70); f.drop();
    await new Promise((r) => setTimeout(r, 0));
    expect(readings).toEqual([]);
    expect(f.char.stopNotifications).toHaveBeenCalled();
    expect(f.dev.gatt.disconnect).toHaveBeenCalled();
    expect(states.at(-1)).toBe('idle');
  });
});

describe('isFresh', () => {
  it('an old reading is not shown as live', () => {
    expect(isFresh(1000, 1000 + STALE_AFTER_MS)).toBe(true);
    expect(isFresh(1000, 1000 + STALE_AFTER_MS + 1)).toBe(false);
    expect(isFresh(null, 5)).toBe(false);
  });
});
