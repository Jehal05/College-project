import { describe, expect, it } from 'vitest';
import { isLocalAddress } from '../../src/utils/publicAddress';

describe('isLocalAddress', () => {
  it('flags addresses a phone cannot reach', () => {
    for (const u of ['http://localhost:4000', 'http://127.0.0.1:4000', 'http://[::1]:4000', 'http://demo.localhost', 'not a url', '']) expect(isLocalAddress(u)).toBe(true);
  });
  it('accepts a network address', () => {
    for (const u of ['http://192.168.1.20:4000', 'https://demo.example.org']) expect(isLocalAddress(u)).toBe(false);
  });
});
