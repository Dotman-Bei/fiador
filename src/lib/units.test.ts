import { describe, expect, it } from 'vitest';
import { formatNear, GAS_300_TGAS, parseNear, TGAS, YOCTO_PER_NEAR } from './units';

describe('units', () => {
  it('parses whole and fractional NEAR into yocto', () => {
    expect(parseNear('6')).toBe(6n * YOCTO_PER_NEAR);
    expect(parseNear('0.01')).toBe(10n ** 22n);
    expect(parseNear(' 1.5 ')).toBe(15n * 10n ** 23n);
  });
  it('rejects malformed amounts and more than 24 decimals', () => {
    expect(() => parseNear('abc')).toThrow('invalid NEAR amount');
    expect(() => parseNear('1.0000000000000000000000001')).toThrow('invalid NEAR amount');
  });
  it('formats yocto as NEAR, truncating to the requested decimals', () => {
    expect(formatNear(6n * YOCTO_PER_NEAR)).toBe('6');
    expect(formatNear('10000000000000000000000')).toBe('0.01');
    expect(formatNear(1234567n * 10n ** 18n, 2)).toBe('1.23');
  });
  it('defines gas units', () => {
    expect(TGAS).toBe(10n ** 12n);
    expect(GAS_300_TGAS).toBe(300n * 10n ** 12n);
  });
});
