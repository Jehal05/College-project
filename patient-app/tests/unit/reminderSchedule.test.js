// Reminder scheduling. Dates are built in LOCAL time (like the app), so these tests give the same result in any time zone.
import { describe, expect, it } from 'vitest';
import { DUE_WINDOW_MS, dueNow, nextDue, slotKey, slotsOn, snoozedBack, validateReminder, visibleDue } from '../../src/utils/reminderSchedule';

const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0);
// 13 Nov 2026 is a Friday (day 5).
const daily = { id: 'M-1', name: 'A', times: ['08:00'], days: [0, 1, 2, 3, 4, 5, 6], paused: false };
const weekdays = { id: 'M-2', name: 'B', times: ['20:00'], days: [1, 2, 3, 4, 5], paused: false };

describe('reminder schedule', () => {
  it('lists the slots on a day and respects the days of the week', () => {
    expect(slotsOn(daily, at(2026, 11, 13))).toEqual([at(2026, 11, 13, 8, 0)]);
    expect(slotsOn(weekdays, at(2026, 11, 14))).toEqual([]); // Saturday
  });
  it('is due from its time for 30 minutes, not before and not after', () => {
    expect(dueNow(daily, at(2026, 11, 13, 7, 59))).toEqual([]);
    expect(dueNow(daily, at(2026, 11, 13, 8, 0))).toHaveLength(1);
    expect(dueNow(daily, at(2026, 11, 13, 8, 29))).toHaveLength(1);
    expect(dueNow(daily, new Date(at(2026, 11, 13, 8, 0).getTime() + DUE_WINDOW_MS))).toEqual([]);
  });
  it('a slot just before midnight is still due just after it', () => {
    const late = { ...daily, times: ['23:50'] };
    expect(dueNow(late, at(2026, 11, 14, 0, 5))).toEqual([at(2026, 11, 13, 23, 50)]);
  });
  it('finds the next slot, skipping days that are not scheduled', () => {
    expect(nextDue(weekdays, at(2026, 11, 13, 21, 0))).toEqual(at(2026, 11, 16, 20, 0)); // Friday night -> Monday
    expect(nextDue(daily, at(2026, 11, 13, 7, 0))).toEqual(at(2026, 11, 13, 8, 0));
  });
  it('a paused reminder is never due and has no next time', () => {
    const p = { ...daily, paused: true };
    expect(dueNow(p, at(2026, 11, 13, 8, 5))).toEqual([]); expect(nextDue(p, at(2026, 11, 13, 7, 0))).toBe(null);
  });
  it('hides a slot that was taken or snoozed, and brings a snoozed one back later', () => {
    const now = at(2026, 11, 13, 8, 5); const key = slotKey('M-1', at(2026, 11, 13, 8, 0));
    expect(visibleDue([daily], now, new Set(), new Map())).toHaveLength(1);
    expect(visibleDue([daily], now, new Set([key]), new Map())).toEqual([]);
    expect(visibleDue([daily], now, new Set(), new Map([[key, now.getTime() + 600000]]))).toEqual([]);
    const later = at(2026, 11, 13, 8, 16);
    expect(visibleDue([daily], later, new Set(), new Map([[key, now.getTime() + 600000]]))).toHaveLength(1);
  });
  it('a snoozed slot comes back even after its 30 minutes have passed, unless taken', () => {
    const key = slotKey('M-1', at(2026, 11, 13, 8, 0)); const snoozed = new Map([[key, at(2026, 11, 13, 8, 40).getTime()]]);
    expect(snoozedBack([daily], at(2026, 11, 13, 8, 45), new Set(), snoozed)).toHaveLength(1);
    expect(snoozedBack([daily], at(2026, 11, 13, 8, 45), new Set([key]), snoozed)).toEqual([]);
    expect(snoozedBack([daily], at(2026, 11, 13, 8, 30), new Set(), snoozed)).toEqual([]);
  });
  it('checks the form: name, note length, times and days', () => {
    const ok = { name: 'A', dose_note: '', times: ['08:00'], days: [1] };
    expect(validateReminder(ok)).toEqual({});
    expect(validateReminder({ ...ok, name: ' ' }).name).toBeTruthy();
    expect(validateReminder({ ...ok, name: 'x'.repeat(61) }).name).toBeTruthy();
    expect(validateReminder({ ...ok, dose_note: 'x'.repeat(61) }).dose_note).toBeTruthy();
    expect(validateReminder({ ...ok, times: ['8:00'] }).times).toBeTruthy();
    expect(validateReminder({ ...ok, times: ['08:00', '08:00'] }).times).toBeTruthy();
    expect(validateReminder({ ...ok, days: [] }).days).toBeTruthy();
  });
});
