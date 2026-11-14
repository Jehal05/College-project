import { describe, expect, it } from 'vitest';
import { isExpired, timeLeft } from '../../src/utils/passportTime';

const now = Date.parse('2026-11-13T10:00:00Z'); const at = (ms) => new Date(now + ms).toISOString();
const H = 3600 * 1000;
describe('passport time left', () => {
  it('a fresh 24 hour passport says 24 hours', () => { expect(timeLeft(at(24 * H), now)).toEqual({ key: 'passport.left.hours', count: 24 }); });
  it('a fresh 1 hour passport says 1 hour', () => { expect(timeLeft(at(H), now)).toEqual({ key: 'passport.left.hours', count: 1 }); });
  it('a fresh 7 day passport says 7 days', () => { expect(timeLeft(at(168 * H), now)).toEqual({ key: 'passport.left.days', count: 7 }); });
  it('rounds hours down as time passes', () => { expect(timeLeft(at(23.5 * H), now)).toEqual({ key: 'passport.left.hours', count: 23 }); });
  it('uses minutes under an hour and "soon" at the very end', () => {
    expect(timeLeft(at(30 * 60000), now)).toEqual({ key: 'passport.left.minutes', count: 30 }); expect(timeLeft(at(200), now).key).toBe('passport.left.soon');
  });
  it('knows when it has expired', () => { expect(isExpired(at(-1), now)).toBe(true); expect(isExpired(at(1000), now)).toBe(false); });
});
