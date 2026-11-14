import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { currentLocale, formatElapsed, formatNumber, secondsBetween } from '../../src/utils/time';

describe('time formatting', () => {
  it('formats elapsed time as mm:ss and h:mm:ss', () => {
    expect(formatElapsed(75)).toBe('01:15'); expect(formatElapsed(3725)).toBe('1:02:05'); expect(formatElapsed(-5)).toBe('00:00');
  });
  it('counts whole seconds and never goes negative', () => {
    expect(secondsBetween('2026-01-01T00:00:00Z', '2026-01-01T00:01:30.9Z')).toBe(90); expect(secondsBetween('2026-01-01T00:01:00Z', '2026-01-01T00:00:00Z')).toBe(0);
  });
  describe('follows the active language', () => {
    beforeAll(() => i18n.changeLanguage('en'));
    it('uses en-IN, hi-IN and gu-IN', async () => {
      expect(currentLocale()).toBe('en-IN'); await i18n.changeLanguage('hi'); expect(currentLocale()).toBe('hi-IN'); await i18n.changeLanguage('gu'); expect(currentLocale()).toBe('gu-IN');
      await i18n.changeLanguage('en');
    });
    it('formats numbers with Intl', () => { expect(formatNumber(1234567)).toBe('12,34,567'); });
  });
});
