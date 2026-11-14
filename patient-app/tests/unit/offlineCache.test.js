import { beforeEach, describe, expect, it } from 'vitest';
import { clearCopies, isCacheable, readCopy, saveCopy } from '../../src/utils/offlineCache';

beforeEach(() => clearCopies());

describe('offline saved copies', () => {
  it('only the allowed read paths are cacheable', () => {
    for (const ok of ['/patients/PT-2026-0417', '/patients/PT-2026-0417/contacts', '/patients/PT-2026-0417/consents', '/patients/PT-2026-0417/reports', '/patients/PT-2026-0417/baseline']) expect(isCacheable(ok)).toBe(true);
    for (const no of ['/emergencies/E-1', '/patients/PT-2026-0417/passport', '/patients/PT-2026-0417/passport/log', '/passport/abc', '/patients/PT-2026-0417/vitals', '/patients/PT-2026-0417/reports/R-1/file']) expect(isCacheable(no)).toBe(false);
  });
  it('saves and reads a copy; unknown paths return undefined', () => {
    saveCopy('/patients/PT-2026-0417/contacts', [{ name: 'Sunita Mehta' }]); expect(readCopy('/patients/PT-2026-0417/contacts')).toEqual([{ name: 'Sunita Mehta' }]); expect(readCopy('/patients/PT-2026-0417/consents')).toBeUndefined();
  });
  it('never saves passport data', () => { saveCopy('/patients/PT-2026-0417/passport', { token: 'secret' }); expect(readCopy('/patients/PT-2026-0417/passport')).toBeUndefined(); });
  it('clearing removes copies and the unsent emergency', () => {
    saveCopy('/patients/PT-2026-0417', { name: 'Rahul' }); sessionStorage.setItem('ht.pending', '{}'); clearCopies();
    expect(readCopy('/patients/PT-2026-0417')).toBeUndefined(); expect(sessionStorage.getItem('ht.pending')).toBeNull();
  });
});
