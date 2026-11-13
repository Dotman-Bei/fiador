import { describe, expect, it } from 'vitest';
import type { LoanView, MemberView } from '../../src/lib/desk';
import { loan, member, NEAR } from '../../src/lib/fixtures/desk';
import { checkStory, isStoryRecord } from './story-expect';
import type { StoryRecord } from './story-expect';

const RECORD: StoryRecord = {
  run: '1',
  at: '2026-11-14T09:00:00.000Z',
  personas: { ada: 'ada-1.r.testnet', bayo: 'bayo-1.r.testnet', chidi: 'chidi-1.r.testnet' },
  loans: { money_shot: 0, council: 1, late: 2, defaulted: 3, refused: 4 },
  treasury: { before: '100', after_payout: '94', after_repay: '100' },
};

function good(): { loans: Map<number, LoanView>; members: Map<string, MemberView> } {
  const loans = new Map<number, LoanView>([
    [0, loan({ id: 0, status: 'Repaid' })],
    [1, loan({ id: 1, status: 'Repaid', lane: 'Council' })],
    [2, loan({ id: 2, status: 'RepaidLate' })],
    [3, loan({ id: 3, status: 'Defaulted' })],
    [4, loan({ id: 4, status: 'Refused', proposal_id: null })],
  ]);
  const members = new Map<string, MemberView>([
    ['ada-1.r.testnet', member({ account_id: 'ada-1.r.testnet', standing: (4n * NEAR).toString() })],
    ['bayo-1.r.testnet', member({ account_id: 'bayo-1.r.testnet', standing: (5n * NEAR).toString() })],
    ['chidi-1.r.testnet', member({ account_id: 'chidi-1.r.testnet', standing: '0' })],
  ]);
  return { loans, members };
}

describe('checkStory', () => {
  it('accepts the expected end state', () => {
    const { loans, members } = good();
    expect(checkStory(RECORD, loans, members)).toEqual([]);
    expect(isStoryRecord(RECORD)).toBe(true);
    expect(isStoryRecord({ ...RECORD, loans: { money_shot: 0 } })).toBe(false);
  });
  it('reports a wrong status, a wrong standing and an unrecovered treasury', () => {
    const { loans, members } = good();
    loans.set(3, loan({ id: 3, status: 'Active' }));
    members.set('bayo-1.r.testnet', member({ account_id: 'bayo-1.r.testnet' }));
    const problems = checkStory({ ...RECORD, treasury: { before: '100', after_payout: '94', after_repay: '94' } }, loans, members);
    expect(problems).toEqual([
      'defaulted: loan #3 is Active, expected Defaulted',
      'bayo: standing 4000000000000000000000000, expected 5000000000000000000000000',
      'treasury did not recover: 100 -> 94',
    ]);
  });
});
