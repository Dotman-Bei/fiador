import type { ConfigView, LoanView, MemberView } from '../desk';
import { DEMO_PARAMS } from '../desk';

export const NEAR = 10n ** 24n;
export const DAO = 'fiador.sputnikv2.testnet';
export const DESK = 'desk.root.testnet';

export function loan(over: Partial<LoanView> & { id: number }): LoanView {
  return {
    borrower: 'ada.root.testnet',
    principal: (6n * NEAR).toString(),
    borrower_part: (4n * NEAR).toString(),
    cosigner: 'bayo.root.testnet',
    pledge: (2n * NEAR).toString(),
    lane: 'Cosigned',
    status: 'Repaid',
    proposal_id: over.id + 10,
    created_at_ms: 1_800_000_000_000,
    due_at_ms: 1_800_000_120_000,
    closed_at_ms: 1_800_000_060_000,
    ...over,
  };
}

export function member(over: Partial<MemberView> & { account_id: string }): MemberView {
  return {
    standing: (4n * NEAR).toString(),
    drawn: '0',
    pledged: '0',
    unused: (4n * NEAR).toString(),
    open_loans: 0,
    visitor: null,
    repaid_on_time: 0,
    defaults: 0,
    ...over,
  };
}

export function config(over: Partial<ConfigView> = {}): ConfigView {
  return { dao: DAO, params: DEMO_PARAMS, book: '0', member_count: 2, loan_count: 1, request_count: 0, ...over };
}
