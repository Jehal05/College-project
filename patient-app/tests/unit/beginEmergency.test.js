import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/api', () => ({ createEmergency: vi.fn(), getPatient: vi.fn() }));
import { createEmergency } from '../../src/services/api';
import { beginEmergency, clearPending } from '../../src/hooks/usePendingEmergency';

const consents = { location: true, history: true, vitals: true, reports: true };

describe('beginEmergency when the server refuses or fails', () => {
  beforeEach(() => { clearPending(); createEmergency.mockReset(); });

  it('keeps the alert as "not sent yet" after a 429 (never shown as sent)', async () => {
    createEmergency.mockRejectedValue(Object.assign(new Error('Too many'), { status: 429 }));
    const r = await beginEmergency('PT-1', 'HEART', ['CHEST_PAIN'], { online: true, savedConsents: consents });
    expect(r).toEqual({ pending: true });
    expect(JSON.parse(sessionStorage.getItem('ht.pending')).type).toBe('HEART');
  });

  it('keeps it after a network failure, as before', async () => {
    createEmergency.mockRejectedValue(Object.assign(new Error('network'), { code: 'NETWORK' }));
    expect(await beginEmergency('PT-1', 'HEART', [], { online: true, savedConsents: consents })).toEqual({ pending: true });
  });

  it('still throws for other server errors (the screen shows its error)', async () => {
    createEmergency.mockRejectedValue(Object.assign(new Error('bad'), { status: 400 }));
    await expect(beginEmergency('PT-1', 'HEART', [], { online: true, savedConsents: consents })).rejects.toThrow('bad');
    expect(sessionStorage.getItem('ht.pending')).toBeNull();
  });
});
