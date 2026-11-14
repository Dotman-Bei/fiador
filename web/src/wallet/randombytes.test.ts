import { describe, expect, it } from 'vitest';
import randomBytes from './randombytes';

describe('randombytes stand-in', () => {
  it('returns the requested number of random bytes as a Uint8Array', () => {
    const a = randomBytes(32);
    const b = randomBytes(32);
    expect(a).toBeInstanceOf(Uint8Array);
    expect(a).toHaveLength(32);
    expect([...a]).not.toEqual([...b]);
    expect(new Uint8Array([...a, ...b])).toHaveLength(64);
  });

  it('fills sizes above the Web Crypto 64 KiB limit', () => {
    const big = randomBytes(65_536 * 2 + 5);
    expect(big).toHaveLength(131_077);
    expect(big.subarray(131_000).some((x) => x !== 0)).toBe(true);
  });

  it('handles zero and refuses bad sizes', () => {
    expect(randomBytes(0)).toHaveLength(0);
    expect(() => randomBytes(-1)).toThrow(RangeError);
    expect(() => randomBytes(1.5)).toThrow(RangeError);
  });
});
