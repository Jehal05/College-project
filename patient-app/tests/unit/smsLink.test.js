import { describe, expect, it } from 'vitest';
import { buildMessage, mapLink, platformOf, primaryFirst, smsHref } from '../../src/utils/smsLink';

const TEXT = 'I need help. This is a simulated alert from the HealthTwin demo.';

describe('SMS fallback links', () => {
  it('uses ? for the body on Android and & on iPhone', () => {
    expect(smsHref('+91 00000 00001', 'hi there', 'android')).toBe('sms:+910000000001?body=hi%20there');
    expect(smsHref('+91 00000 00001', 'hi there', 'ios')).toBe('sms:+910000000001&body=hi%20there');
  });
  it('picks the form from the user agent, Android for everything else', () => {
    expect(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
    expect(platformOf('Mozilla/5.0 (Linux; Android 14)')).toBe('android'); expect(platformOf('')).toBe('android'); expect(platformOf(undefined)).toBe('android');
  });
  it('adds a map link only when a location is given', () => {
    expect(buildMessage(TEXT, null)).toBe(TEXT);
    expect(buildMessage(TEXT, { lat: 21.1702, lng: 72.8311 })).toBe(TEXT + ' https://maps.google.com/?q=21.17020,72.83110');
    expect(mapLink({ lat: 1, lng: 2 })).toBe('https://maps.google.com/?q=1.00000,2.00000');
  });
  it('the text holds no health words', () => { expect(buildMessage(TEXT, { lat: 1, lng: 2 })).not.toMatch(/symptom|chest|heart rate|spo2|glucose|allerg|condition|medic|diagnos/i); });
  it('puts the primary contact first and keeps the rest in order', () => {
    const list = [{ id: 'a' }, { id: 'b', is_primary: true }, { id: 'c' }];
    expect(primaryFirst(list).map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });
});
