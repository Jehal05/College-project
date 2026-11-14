import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { stages, endedAs, pickActive, showEta, hasEvent, STAGES } from '../../src/utils/emergencyCenter';

const ev = (...states) => states.map((state, i) => ({ state, timestamp: '2026-01-01T10:00:0' + i + 'Z' }));
const lang = (c) => JSON.parse(readFileSync(new URL(`../../src/i18n/${c}.json`, import.meta.url), 'utf8'));

describe('emergency center rules', () => {
  it('marks a step done only when that exact event exists', () => {
    const rows = stages(ev('EMERGENCY_DETECTED', 'SOS_SENT', 'EN_ROUTE')); // EN_ROUTE without AMBULANCE_DISPATCHED
    const done = Object.fromEntries(rows.map((r) => [r.key, r.done]));
    expect(done).toMatchObject({ detected: true, sos: true, ack: false, dispatched: false, enroute: true, arrived: false });
  });
  it('never shows dispatched or an ETA before the dispatch event', () => {
    expect(hasEvent(ev('SOS_SENT', 'HOSPITAL_ACKNOWLEDGED'), 'AMBULANCE_DISPATCHED')).toBe(false);
    expect(showEta(ev('SOS_SENT'), 600)).toBe(false);
    expect(showEta(ev('SOS_SENT', 'AMBULANCE_DISPATCHED'), 600)).toBe(true);
    expect(showEta(ev('AMBULANCE_DISPATCHED'), undefined)).toBe(false);
  });
  it('keeps sent and acknowledged as separate steps', () => {
    const rows = stages(ev('EMERGENCY_DETECTED', 'SOS_SENT'));
    expect(rows.find((r) => r.key === 'sos').done).toBe(true); expect(rows.find((r) => r.key === 'ack').done).toBe(false);
  });
  it('reports a cancelled or escalated ending only when it is the latest event', () => {
    expect(endedAs(ev('SOS_SENT', 'CANCELLED'))).toBe('CANCELLED');
    expect(endedAs(ev('SOS_SENT', 'ESCALATED'))).toBe('ESCALATED');
    expect(endedAs(ev('SOS_SENT'))).toBe(null); expect(endedAs([])).toBe(null);
  });
  it('follows the remembered emergency, else the newest unfinished one', () => {
    const list = [{ id: 'b', final_state: 'HANDOVER_DONE' }, { id: 'c', final_state: 'EN_ROUTE' }];
    expect(pickActive('x', list)).toBe('x'); expect(pickActive(null, list)).toBe('c'); expect(pickActive(null, [list[0]])).toBe(null);
  });
  it('has text for every step in en, hi and gu, and the three languages match', () => {
    for (const c of ['en', 'hi', 'gu']) { const t = lang(c); for (const [k] of STAGES) expect(t['emc.stage.' + k], c + k).toBeTruthy(); }
    const keys = (c) => Object.keys(lang(c)).filter((k) => k.startsWith('emc.')).sort();
    expect(keys('hi')).toEqual(keys('en')); expect(keys('gu')).toEqual(keys('en'));
  });
});
