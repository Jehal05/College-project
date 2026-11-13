import { beforeEach, describe, expect, it } from 'vitest';
import { clearCopies, isCacheable, readCopy, saveCopy } from '../../src/utils/offlineCache';

beforeEach(() => clearCopies());

describe('offline saved copies', () => {
  it('only the allowed read paths are cacheable', () => {
    for (const ok of ['/patients/HT-1001', '/patients/HT-1001/contacts', '/patients/HT-1001/consents', '/patients/HT-1001/reports', '/patients/HT-1001/baseline']) expect(isCacheable(ok)).toBe(true);
    for (const no of ['/emergencies/E-1', '/patients/HT-1001/passport', '/patients/HT-1001/passport/log', '/passport/abc', '/patients/HT-1001/vitals', '/patients/HT-1001/reports/R-1/file']) expect(isCacheable(no)).toBe(false);
  });
  it('saves and reads a copy; unknown paths return undefined', () => {
    saveCopy('/patients/HT-1001/contacts', [{ name: 'Asha Demo' }]); expect(readCopy('/patients/HT-1001/contacts')).toEqual([{ name: 'Asha Demo' }]); expect(readCopy('/patients/HT-1001/consents')).toBeUndefined();
  });
  it('never saves passport data', () => { saveCopy('/patients/HT-1001/passport', { token: 'secret' }); expect(readCopy('/patients/HT-1001/passport')).toBeUndefined(); });
  it('clearing removes copies and the unsent emergency', () => {
    saveCopy('/patients/HT-1001', { name: 'Rahul' }); sessionStorage.setItem('ht.pending', '{}'); clearCopies();
    expect(readCopy('/patients/HT-1001')).toBeUndefined(); expect(sessionStorage.getItem('ht.pending')).toBeNull();
  });
});
