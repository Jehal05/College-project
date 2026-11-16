import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryDelay, isDeadLogin, STABLE_MS } from '../../src/utils/reconnect';
import { connectEvents } from '../../src/services/socket';

describe('reconnect timing', () => {
  it('doubles from 2 s and stops at 30 s', () => {
    expect([0, 1, 2, 3, 4, 50].map(retryDelay)).toEqual([2000, 4000, 8000, 16000, 30000, 30000]);
  });
  it('bad input behaves like the first attempt', () => {
    for (const bad of [undefined, null, -3, NaN, 'x']) expect(retryDelay(bad)).toBe(2000);
  });
  it('only code 1008 is a dead login', () => {
    expect(isDeadLogin(1008)).toBe(true);
    expect(isDeadLogin(1006)).toBe(false);
    expect(isDeadLogin(undefined)).toBe(false);
  });
});

describe('connectEvents reconnecting (fake WebSocket, fake timers)', () => {
  let sockets;
  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    class FakeSocket {
      constructor() { this.readyState = 0; sockets.push(this); }
      close() {}
    }
    FakeSocket.CONNECTING = 0;
    vi.stubGlobal('WebSocket', FakeSocket);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not open a new socket after code 1008', () => {
    const states = [];
    connectEvents(() => {}, (on) => states.push(on));
    sockets[0].onopen();
    sockets[0].onclose({ code: 1008 });
    vi.advanceTimersByTime(120000);
    expect(sockets).toHaveLength(1);
    expect(states.at(-1)).toBe(false);
  });

  it('waits longer each time when the server closes a socket straight after opening', () => {
    connectEvents(() => {}, () => {});
    const opened = [];
    for (let i = 0; i < 4; i++) {
      sockets[i].onopen();
      sockets[i].onclose({ code: 1006 });
      vi.advanceTimersByTime(retryDelay(i) - 1);
      expect(sockets).toHaveLength(i + 1); // not yet
      vi.advanceTimersByTime(1);
      opened.push(sockets.length);
    }
    expect(opened).toEqual([2, 3, 4, 5]);
  });

  it('starts again from 2 s after a socket stayed open long enough', () => {
    connectEvents(() => {}, () => {});
    sockets[0].onopen();
    sockets[0].onclose({ code: 1006 });
    vi.advanceTimersByTime(2000); // socket 1
    sockets[1].onopen();
    vi.advanceTimersByTime(STABLE_MS);
    sockets[1].onclose({ code: 1006 });
    vi.advanceTimersByTime(2000);
    expect(sockets).toHaveLength(3);
  });
});
