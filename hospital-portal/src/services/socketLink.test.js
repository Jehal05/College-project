import test from 'node:test';
import assert from 'node:assert/strict';
import { createLink } from './socketLink.js';

// A fake WebSocket and a fake clock: nothing real is opened and no test waits.
function setup() {
  const sockets = [];
  const statuses = [];
  let t = 0;
  const timers = [];
  const link = createLink({
    makeSocket: () => {
      const s = { closed: false, close() { this.closed = true; } };
      sockets.push(s);
      return s;
    },
    onStatus: (x) => statuses.push(x),
    setTimer: (fn, ms) => { const id = { fn, ms, at: t + ms, live: true }; timers.push(id); return id; },
    clearTimer: (id) => { if (id) id.live = false; },
    now: () => t,
    random: () => 0.5, // no jitter: 2000, 4000, 8000 ...
  });
  const pending = () => timers.filter((x) => x.live);
  const advance = (ms) => {
    t += ms;
    for (const x of pending()) if (x.at <= t) { x.live = false; x.fn(); }
  };
  return { link, sockets, statuses, pending, advance, last: () => sockets[sockets.length - 1] };
}

test('code 1008: no new socket, no timer, status signed_out', () => {
  const h = setup();
  h.link.start();
  h.last().onopen();
  h.last().onclose({ code: 1008 });
  assert.equal(h.pending().length, 0);
  h.advance(120000);
  assert.equal(h.sockets.length, 1);
  assert.equal(h.statuses.at(-1), 'signed_out');
});

test('a server that accepts and closes at once gets slower and slower, not a 2 s loop', () => {
  const h = setup();
  h.link.start();
  const waits = [];
  for (let i = 0; i < 6; i++) {
    h.last().onopen();
    h.last().onclose({ code: 1006 });
    waits.push(h.pending()[0].ms);
    h.advance(h.pending()[0].ms);
  }
  assert.deepEqual(waits, [2000, 4000, 8000, 16000, 30000, 30000]);
  assert.equal(h.sockets.length, 7);
});

test('a socket that stayed open for 10 s or more starts the wait again from 2 s', () => {
  const h = setup();
  h.link.start();
  h.last().onopen();
  h.last().onclose({ code: 1006 });
  h.advance(2000);
  h.last().onopen();
  h.last().onclose({ code: 1006 });
  assert.equal(h.pending()[0].ms, 4000);
  h.advance(4000);
  h.last().onopen();
  h.advance(10000);
  h.last().onclose({ code: 1006 });
  assert.equal(h.pending()[0].ms, 2000);
});

test('stop() closes the socket, cancels the retry and does not reconnect later', () => {
  const h = setup();
  h.link.start();
  h.last().onclose({ code: 1006 });
  assert.equal(h.pending().length, 1);
  h.link.stop('connecting');
  assert.equal(h.pending().length, 0);
  const s = h.last();
  h.link.start();
  h.link.stop('connecting');
  assert.equal(h.last().closed, true);
  assert.notEqual(s, undefined);
});

test('after signed_out, start() can open a new socket (the desk logged in again)', () => {
  const h = setup();
  h.link.start();
  h.last().onclose({ code: 1008 });
  h.link.start();
  assert.equal(h.sockets.length, 2);
});
