// Live sharing logic with a FAKE geolocation and a fake timer: no GPS, no Bluetooth, no network.
import { describe, it, expect, vi } from 'vitest';
import { buildUpdate, createLiveShare, POSITION_STALE_MS, OPEN_STATES } from '../../src/services/liveShare';

const pos = (over = {}) => ({ lat: 23.03, lng: 72.58, accuracy: 12, at: 1000, ...over });

describe('buildUpdate', () => {
  it('sends position and heart rate when both are allowed and fresh', () => {
    expect(buildUpdate({ position: pos(), bpm: 141, locationOn: true, heartOn: true, now: 2000 })).toEqual({ lat: 23.03, lng: 72.58, accuracy: 12, heart_rate: 141 });
  });
  it('leaves out what the consent does not allow', () => {
    expect(buildUpdate({ position: pos(), bpm: 141, locationOn: false, heartOn: true, now: 2000 })).toEqual({ heart_rate: 141 });
    expect(buildUpdate({ position: pos(), bpm: 141, locationOn: true, heartOn: false, now: 2000 })).toEqual({ lat: 23.03, lng: 72.58, accuracy: 12 });
    expect(buildUpdate({ position: pos(), bpm: 141, locationOn: false, heartOn: false, now: 2000 })).toBeNull();
  });
  it('does not send an old position or a missing heart rate', () => {
    expect(buildUpdate({ position: pos(), bpm: null, locationOn: true, heartOn: true, now: 1000 + POSITION_STALE_MS + 1 })).toBeNull();
    expect(buildUpdate({ position: null, bpm: null, locationOn: true, heartOn: true })).toBeNull();
  });
  it('only open alert states stream', () => {
    expect(OPEN_STATES).toContain('SOS_SENT');
    expect(OPEN_STATES).not.toContain('CANCELLED');
    expect(OPEN_STATES).not.toContain('EMERGENCY_DETECTED');
  });
});

describe('createLiveShare', () => {
  const setup = (over = {}) => {
    let onPos, onErr; const timers = [];
    const geolocation = { watchPosition: vi.fn((ok, err) => { onPos = ok; onErr = err; return 7; }), clearWatch: vi.fn() };
    const post = vi.fn(() => Promise.resolve({}));
    const statuses = [];
    const share = createLiveShare({ post, geolocation, getBpm: () => 150, locationOn: true, heartOn: true, onStatus: (s) => statuses.push(s), now: () => 1500,
      setTimer: (fn) => { timers.push(fn); return timers.length; }, clearTimer: vi.fn(), ...over });
    return { share, post, geolocation, statuses, give: (lat, lng) => onPos({ coords: { latitude: lat, longitude: lng, accuracy: 9 } }), deny: () => onErr({ code: 1 }), tick: () => timers[0]() };
  };
  it('waits until a position or heart rate exists, then posts', async () => {
    const s = setup({ getBpm: () => null }); s.share.start(); s.tick();
    expect(s.post).not.toHaveBeenCalled();
    s.give(23.1, 72.6); s.tick();
    expect(s.post).toHaveBeenCalledWith({ lat: 23.1, lng: 72.6, accuracy: 9 });
    await Promise.resolve(); await Promise.resolve();
    expect(s.statuses).toContain('sharing');
  });
  it('reports denied when the browser blocks location and there is no heart rate', () => {
    const s = setup({ getBpm: () => null }); s.share.start(); s.deny(); s.tick();
    expect(s.statuses[s.statuses.length - 1]).toBe('denied');
  });
  it('stops on a 409 (alert closed) and clears the watch', async () => {
    const s = setup({ post: vi.fn(() => Promise.reject({ status: 409 })) }); s.share.start(); s.give(1, 2); s.tick();
    await Promise.resolve(); await Promise.resolve();
    expect(s.statuses[s.statuses.length - 1]).toBe('ended');
    expect(s.geolocation.clearWatch).toHaveBeenCalledWith(7);
  });
  it('sends one request at a time while the last one is still waiting', async () => {
    let release; const post = vi.fn(() => new Promise((r) => { release = r; }));
    const s = setup({ post }); s.share.start(); s.give(1, 2); s.tick(); s.tick(); s.tick();
    expect(post).toHaveBeenCalledTimes(1);
    release({}); await Promise.resolve(); await Promise.resolve();
    s.tick();
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('never watches the position when location is not allowed', () => {
    const s = setup({ locationOn: false }); s.share.start();
    expect(s.geolocation.watchPosition).not.toHaveBeenCalled();
    s.tick();
    expect(s.post).toHaveBeenCalledWith({ heart_rate: 150 });
  });
});
