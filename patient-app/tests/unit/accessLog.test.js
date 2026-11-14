import { describe, expect, it } from 'vitest';
import { describeEntry, mergeEntries } from '../../src/utils/accessLog';

const t = (k, o) => k + (o ? JSON.stringify(o) : '');

describe('access log helpers', () => {
  it('describes an allowed read with the fields shown', () => {
    const d = describeEntry(t, { who: { kind: 'hospital_desk', hospital: 'City Care' }, what: 'passport', outcome: 'allowed', fields: ['blood_group', 'allergies'] });
    expect(d.who).toContain('access.who.hospital_named');
    expect(d.what).toBe('access.what.passport');
    expect(d.result).toContain('blood group, allergies');
    expect(d.blocked).toBe(false);
  });
  it('marks blocked and empty reads', () => {
    expect(describeEntry(t, { who: { kind: 'qr_link' }, what: 'passport', outcome: 'denied', fields: [] }).blocked).toBe(true);
    expect(describeEntry(t, { who: { kind: 'relative' }, what: 'status', outcome: 'ALLOWED', fields: [] }).result).toBe('access.nothing');
  });
  it('falls back for unknown kinds', () => {
    const d = describeEntry(t, {});
    expect(d.who).toBe('access.who.unknown');
    expect(d.what).toBe('access.what.data');
  });
  it('merges live entries on top without duplicates', () => {
    expect(mergeEntries([{ id: 2 }, { id: 1 }], [{ id: 3 }, { id: 2 }]).map((x) => x.id)).toEqual([3, 2, 1]);
  });
});
