import { describe, expect, it } from 'vitest';
import { DEMO_PARAMS } from '../../src/lib/desk';
import { changedFields, parseSeconds, retime } from './params';

/** The live desk's params as seeded on 2026-11-13, before council proposal 16. */
const SEEDED = { ...DEMO_PARAMS, loan_term_sec: 120, grace_sec: 60 };

describe('retime', () => {
  it('changes only the term and grace, keeping every other field exactly', () => {
    const after = retime(SEEDED, 600, 300);
    expect(after).toEqual({ ...SEEDED, loan_term_sec: 600, grace_sec: 300 });
    expect(after).toEqual(DEMO_PARAMS);
    expect(changedFields(SEEDED, after)).toEqual(['loan_term_sec: 120 -> 600', 'grace_sec: 60 -> 300']);
  });

  it('refuses live params with an unexpected shape rather than guessing', () => {
    expect(() => retime({ ...SEEDED, surprise: 1 } as never, 600, 300)).toThrow('extra: surprise');
    const { grace_sec: _g, ...partial } = SEEDED;
    expect(() => retime(partial as never, 600, 300)).toThrow('missing: grace_sec');
  });

  it('reports no change when the values are already set', () => {
    expect(changedFields(DEMO_PARAMS, retime(DEMO_PARAMS, 600, 300))).toEqual([]);
  });
});

describe('parseSeconds', () => {
  it('takes whole seconds from 1 to a day', () => {
    expect(parseSeconds('term', '600')).toBe(600);
    for (const bad of ['0', '-1', '1.5', 'ten', '86401']) expect(() => parseSeconds('term', bad), bad).toThrow('--term');
  });
});
