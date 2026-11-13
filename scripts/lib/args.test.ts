import { describe, expect, it } from 'vitest';
import { flag, hasFlag } from './args';

describe('args', () => {
  it('reads a flag value', () => {
    expect(flag(['seed', '--desk', 'desk2.r.testnet'], 'desk')).toBe('desk2.r.testnet');
    expect(flag(['seed'], 'desk')).toBeUndefined();
  });
  it('rejects a flag without a value', () => {
    expect(() => flag(['--desk'], 'desk')).toThrow('--desk needs a value');
    expect(() => flag(['--desk', '--run', '2'], 'desk')).toThrow('--desk needs a value');
  });
  it('detects a bare flag', () => {
    expect(hasFlag(['--dry-run'], 'dry-run')).toBe(true);
    expect(hasFlag([], 'dry-run')).toBe(false);
  });
});
