import { beforeEach, describe, expect, it } from 'vitest';
import { clearCopies, isCacheable, readCopy, saveCopy } from '../../src/utils/offlineCache';

beforeEach(() => clearCopies());

describe('offline saved copies', () => {
  it('only the allowed read paths are cacheable', () => {
    for (const ok of ['/patients/pat_001', '/patients/pat_001/contacts', '/patients/pat_001/consents', '/patients/pat_001/reports', '/patients/pat_001/baseline']) expect(isCacheable(ok)).toBe(true);
    for (const no of ['/emergencies/E-1', '/patients/pat_001/passport', '/patients/pat_001/passport/log', '/passport/abc', '/patients/pat_001/vitals', '/patients/pat_001/reports/R-1/file']) expect(isCacheable(no)).toBe(false);
  });
  it('saves and reads a copy; unknown paths return undefined', () => {
    saveCopy('/patients/pat_001/contacts', [{ name: 'Asha Demo' }]); expect(readCopy('/patients/pat_001/contacts')).toEqual([{ name: 'Asha Demo' }]); expect(readCopy('/patients/pat_001/consents')).toBeUndefined();
  });
  it('never saves passport data', () => { saveCopy('/patients/pat_001/passport', { token: 'secret' }); expect(readCopy('/patients/pat_001/passport')).toBeUndefined(); });
  it('clearing removes copies and the unsent emergency', () => {
    saveCopy('/patients/pat_001', { name: 'Rahul' }); sessionStorage.setItem('ht.pending', '{}'); clearCopies();
    expect(readCopy('/patients/pat_001')).toBeUndefined(); expect(sessionStorage.getItem('ht.pending')).toBeNull();
  });
});
