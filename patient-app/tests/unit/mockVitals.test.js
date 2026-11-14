// The simulated wearable's profile and override rules (mock-server/vitals.js), same behaviour as Daksh's CONTRACT.md 4.1.
import { beforeEach, describe, expect, it } from 'vitest';
import vitals from '../../../mock-server/vitals.js';

beforeEach(() => vitals.reset());

describe('POST /demo/vitals rules', () => {
  it('accepts a profile, including the scenario names', () => {
    expect(vitals.applyChange({ profile: 'asthma' }).status).toBe(200);
    expect(vitals.applyChange({ profile: 'HEART' }).body.profile).toBe('heart_attack');
  });
  it('an unknown profile is 400 and changes nothing', () => {
    vitals.applyChange({ profile: 'stroke' });
    expect(vitals.applyChange({ profile: 'nope', overrides: { spo2: 90 } }).status).toBe(400);
    expect(vitals.snapshot().profile).toBe('stroke'); expect(vitals.snapshot().overrides).toEqual({});
  });
  it('an out-of-range or unknown vital is 400 and changes nothing', () => {
    expect(vitals.applyChange({ overrides: { spo2: 101 } }).status).toBe(400);
    expect(vitals.applyChange({ overrides: { heart_rate: 150, pulse: 1 } }).status).toBe(400);
    expect(vitals.snapshot().overrides).toEqual({});
  });
  it('an unknown top-level field is 422', () => { expect(vitals.applyChange({ colour: 'red' }).status).toBe(422); });
  it('pinned values show in the next reading; null clears one; {} clears all', () => {
    vitals.applyChange({ overrides: { heart_rate: 150, spo2: 91 } });
    const r = vitals.currentVitals(); expect(r.heart_rate).toBe(150); expect(r.spo2).toBe(91);
    vitals.applyChange({ overrides: { heart_rate: null } });
    expect(vitals.snapshot().overrides).toEqual({ spo2: 91 });
    vitals.applyChange({ overrides: {} });
    expect(vitals.snapshot().overrides).toEqual({});
  });
  it('readings keep the old bp string and add bp_sys and bp_dia; reset goes back to resting', () => {
    const r = vitals.currentVitals(); expect(r.bp).toBe(r.bp_sys + '/' + r.bp_dia);
    vitals.applyChange({ profile: 'stroke' }); vitals.reset();
    expect(vitals.snapshot().profile).toBe('normal');
  });
  it('the heart-emergency profile gives readings outside a usual resting range', () => {
    vitals.applyChange({ profile: 'heart_attack' });
    expect(vitals.currentVitals().heart_rate).toBeGreaterThan(120);
  });
});
