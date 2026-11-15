import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MODULES, STEP_COUNT } from '../../src/config/diseases';
import { ORGANS, organByKey } from '../../src/config/organs';
import { metricStates, areaStatus, dataQuality } from '../../src/utils/diseaseIntel';
import { ecgAt } from '../../src/utils/ecg';
import { detectEvents } from '../../src/utils/monitorEvents';

const lang = (c) => JSON.parse(readFileSync(new URL(`../../src/i18n/${c}.json`, import.meta.url), 'utf8'));
const baseline = { heart_rate: { min: 55, max: 95 }, bp_systolic: { min: 100, max: 130 }, spo2: { min: 94, max: 100 }, glucose: { min: 70, max: 140 } };

describe('disease areas', () => {
  it('each area points at a real organ and has text in all three languages', () => {
    for (const m of MODULES) {
      expect(ORGANS.map((o) => o.key)).toContain(m.organ);
      for (const c of ['en', 'hi', 'gu']) {
        const t = lang(c);
        expect(t[`dis.mod.${m.key}.name`], c + m.key).toBeTruthy();
        expect(t[`dis.mod.${m.key}.about`]).toBeTruthy();
        for (let i = 1; i <= STEP_COUNT; i++) expect(t[`dis.steps.${m.key}.${i}`]).toBeTruthy();
      }
    }
  });
  it('en, hi and gu have the same dis.* and mon.* keys', () => {
    const keys = (c) => Object.keys(lang(c)).filter((k) => /^(dis|mon)\./.test(k)).sort();
    expect(keys('hi')).toEqual(keys('en')); expect(keys('gu')).toEqual(keys('en'));
  });
});

describe('observations', () => {
  const heart = organByKey('heart');
  it('compares the latest reading with the usual range', () => {
    const s = metricStates(heart, { vitals: null, history: { heart_rate: [70, 72], bp_sys: [150] }, baseline });
    expect(s.find((x) => x.key === 'heart_rate').within).toBe(true);
    expect(s.find((x) => x.key === 'bp').within).toBe(false);
    expect(areaStatus(s)).toBe('different');
  });
  it('says "nodata" for areas without live metrics and "waiting" before any reading', () => {
    expect(areaStatus(metricStates(organByKey('kidneys'), { vitals: null, history: {}, baseline }))).toBe('nodata');
    expect(areaStatus(metricStates(heart, { vitals: null, history: { heart_rate: [], bp_sys: [] }, baseline }))).toBe('waiting');
  });
  it('never calls an area within range when there is no usual range', () => {
    expect(areaStatus(metricStates(heart, { vitals: null, history: { heart_rate: [70], bp_sys: [120] }, baseline: null }))).toBe('nodata');
  });
});

describe('data quality', () => {
  it('is low with no live data, better with readings, a range and reports', () => {
    expect(dataQuality({ hasMetrics: false, readings: 0, hasBaseline: false, reports: 0, conditions: 0 })).toMatchObject({ level: 'low', reasons: ['noLive', 'noReports'] });
    expect(dataQuality({ hasMetrics: true, readings: 5, hasBaseline: true, reports: 0, conditions: 0 }).reasons).toEqual(['fewReadings', 'noReports']);
    expect(dataQuality({ hasMetrics: true, readings: 40, hasBaseline: true, reports: 1, conditions: 1 }).level).toBe('good');
  });
});

describe('simulated ECG', () => {
  it('peaks once per beat and stays bounded', () => {
    const bpm = 60; let max = -9; let peaks = 0; let prev = 0; let up = false;
    for (let t = 0; t < 4; t += 0.005) { const v = ecgAt(t, bpm); max = Math.max(max, v); if (v > 0.8 && !up) { peaks++; up = true; } if (v < 0.3) up = false; prev = v; }
    expect(peaks).toBe(4); expect(max).toBeLessThanOrEqual(1.2); expect(prev).toBeDefined();
  });
  it('copes with a missing or silly heart rate', () => {
    expect(Number.isFinite(ecgAt(1, null))).toBe(true); expect(Number.isFinite(ecgAt(1, 9999))).toBe(true);
  });
});

describe('monitor events', () => {
  const rows = (w) => [{ key: 'heart_rate', within: w }];
  it('makes an event only when something changes', () => {
    let r = detectEvents({}, rows(true), true, 1); expect(r.events).toEqual([]);
    r = detectEvents(r.next, rows(true), true, 2); expect(r.events).toEqual([]);
    r = detectEvents(r.next, rows(false), true, 3); expect(r.events.map((e) => e.type)).toEqual(['left']);
    r = detectEvents(r.next, rows(true), false, 4); expect(r.events.map((e) => e.type)).toEqual(['disconnected', 'back']);
  });
  it('ignores readings with no usual range', () => {
    expect(detectEvents({ heart_rate: true }, rows(null), true, 1).events).toEqual([]);
  });
});
