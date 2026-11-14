import test from 'node:test';
import assert from 'node:assert/strict';
import { bannerView, clockText, nextChangeIn, LOST_AFTER_MS, BACK_FOR_MS } from './offlineBanner.js';

const t0 = new Date(2026, 10, 13, 9, 5, 7).getTime();

test('clockText is HH:MM:SS', () => assert.equal(clockText(t0), '09:05:07'));

test('nothing shows before 10 seconds', () => {
  assert.equal(bannerView({ lostAt: t0, backAt: null, reloaded: null, now: t0 + LOST_AFTER_MS - 1 }).kind, 'none');
});
test('lost banner shows at 10 seconds with the time', () => {
  const v = bannerView({ lostAt: t0, backAt: null, reloaded: null, now: t0 + LOST_AFTER_MS });
  assert.equal(v.kind, 'lost');
  assert.equal(v.text, 'Connection lost at 09:05:07. New alerts may be missing.');
});
test('no state at all shows nothing', () => assert.equal(bannerView({ lostAt: null, backAt: null, reloaded: null, now: t0 }).kind, 'none'));
test('a short drop never shows "Reconnected"', () => {
  assert.equal(bannerView({ lostAt: t0, backAt: t0 + 4000, reloaded: 3, now: t0 + 5000 }).kind, 'none');
});
test('reconnected message shows count for 5 seconds, then goes', () => {
  const backAt = t0 + 20000;
  assert.equal(bannerView({ lostAt: t0, backAt, reloaded: 3, now: backAt + 1 }).text, 'Reconnected. Reloaded 3 alerts.');
  assert.equal(bannerView({ lostAt: t0, backAt, reloaded: 1, now: backAt + 1 }).text, 'Reconnected. Reloaded 1 alert.');
  assert.equal(bannerView({ lostAt: t0, backAt, reloaded: 0, now: backAt + 1 }).text, 'Reconnected. Reloaded 0 alerts.');
  assert.equal(bannerView({ lostAt: t0, backAt, reloaded: 3, now: backAt + BACK_FOR_MS - 1 }).kind, 'back');
  assert.equal(bannerView({ lostAt: t0, backAt, reloaded: 3, now: backAt + BACK_FOR_MS }).kind, 'none');
});
test('while the reload is still running it says so', () => {
  assert.equal(bannerView({ lostAt: t0, backAt: t0 + 20000, reloaded: null, now: t0 + 20001 }).text, 'Reconnected. Reloading alerts…');
});
test('nextChangeIn gives the timer something sensible', () => {
  assert.equal(nextChangeIn({ lostAt: null, backAt: null, now: t0 }), null);
  assert.equal(nextChangeIn({ lostAt: t0, backAt: null, now: t0 + 3000 }), 7000);
  assert.equal(nextChangeIn({ lostAt: t0, backAt: t0 + 20000, now: t0 + 22000 }), 3000);
  assert.equal(nextChangeIn({ lostAt: t0, backAt: t0 + 20000, now: t0 + 26000 }), null);
});
