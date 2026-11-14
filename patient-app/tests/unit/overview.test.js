import { describe, expect, it } from 'vitest';
import { bpText, completeness, observations, stats, upcoming } from '../../src/utils/overview';
import { nextDue } from '../../src/utils/reminderSchedule';

const full = { patient: { blood_group: 'B+', allergies: [], conditions: [], medications: [] }, contacts: [{}], reports: [{}], baseline: {}, reminders: [{}], vitals: {} };

describe('overview helpers', () => {
  it('counts what is present and lists what is missing', () => {
    expect(completeness(full)).toMatchObject({ percent: 100, missing: [] });
    const c = completeness({ ...full, reports: [], contacts: [] });
    expect(c.percent).toBe(67); expect(c.missing).toEqual(['contacts', 'reports']);
  });
  it('handles nothing loaded yet', () => {
    expect(completeness().percent).toBe(0);
    expect(completeness({ patient: { blood_group: 'B+' } }).has.profile).toBe(false);
  });
  it('turns twin rows into observations and skips rows without a reading', () => {
    expect(observations([{ key: 'a', within: true }, { key: 'b', within: null }, { key: 'c', within: false }])).toEqual([{ key: 'a', within: true }, { key: 'c', within: false }]);
  });
  it('summarises a series', () => {
    expect(stats([])).toBeNull();
    expect(stats([70, 75, 72])).toEqual({ latest: 72, min: 70, max: 75, count: 3 });
  });
  it('reads blood pressure from either payload shape', () => {
    expect(bpText({ bp: '120/80' })).toBe('120/80');
    expect(bpText({ bp_sys: 118, bp_dia: 79 })).toBe('118/79');
    expect(bpText({ bp: 'junk' })).toBeNull(); expect(bpText(null)).toBeNull();
  });
  it('lists the soonest reminders first and skips paused ones', () => {
    const now = new Date(2026, 10, 14, 9, 0); // a Saturday
    const days = [0, 1, 2, 3, 4, 5, 6];
    const list = [{ id: 'a', name: 'A', times: ['21:00'], days }, { id: 'b', name: 'B', times: ['10:00'], days }, { id: 'c', name: 'C', times: ['09:30'], days, paused: true }];
    expect(upcoming(list, now, nextDue).map((x) => x.id)).toEqual(['b', 'a']);
    expect(upcoming(list, now, nextDue, 1)).toHaveLength(1);
  });
});
