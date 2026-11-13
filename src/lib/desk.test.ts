import { describe, expect, it } from 'vitest';
import { DEMO_PARAMS, holdsReservation, isHeld, isOpen, loansBehindStanding, readDesk } from './desk';
import type { DeskViewer, LoanView } from './desk';
import { loan, member } from './fixtures/desk';

describe('desk helpers', () => {
  it('uses the spec §6 demo parameters', () => {
    expect(DEMO_PARAMS).toMatchObject({
      starter_standing: '4000000000000000000000000',
      max_standing: '10000000000000000000000000',
      book_cap: '12000000000000000000000000',
      loan_term_sec: 120,
      grace_sec: 60,
      request_ttl_sec: 600,
      visitor_slots: 10,
      visitor_deposit: '50000000000000000000000',
      proposal_bond: '0',
    });
  });

  it('mirrors the contract reservation rule', () => {
    expect(holdsReservation(loan({ id: 0, status: 'Active' }))).toBe(true);
    expect(holdsReservation(loan({ id: 0, status: 'Voting' }))).toBe(true);
    expect(holdsReservation(loan({ id: 0, status: 'Repaid' }))).toBe(false);
    expect(holdsReservation(loan({ id: 0, lane: 'Council', status: 'AwaitingCouncil' }))).toBe(false);
    expect(holdsReservation(loan({ id: 0, lane: 'Council', status: 'Active' }))).toBe(true);
    expect(isOpen('AwaitingCouncil')).toBe(true);
    expect(isOpen('Voided')).toBe(false);
  });

  it('finds the repaid loans behind a standing, as borrower or pledging co-signer', () => {
    const loans: LoanView[] = [
      loan({ id: 0 }),
      loan({ id: 1, status: 'Defaulted' }),
      loan({ id: 2, borrower: 'chidi.root.testnet', cosigner: 'ada.root.testnet' }),
      loan({ id: 3, borrower: 'chidi.root.testnet', cosigner: 'ada.root.testnet', pledge: '0' }),
    ];
    expect(loansBehindStanding('ada.root.testnet', loans).map((l) => l.id)).toEqual([0, 2]);
    expect(loansBehindStanding('bayo.root.testnet', loans).map((l) => l.id)).toEqual([0]);
  });

  it('tells a held request from a loan', () => {
    expect(isHeld({ Held: { gap: '2', expires_at_ms: 1 } })).toBe(true);
    expect(isHeld({ Loan: { loan_id: 1, status: 'Active', proposal_id: 3 } })).toBe(false);
  });

  it('reads every page of every view', async () => {
    const calls: string[] = [];
    const many = Array.from({ length: 100 }, (_, i) => loan({ id: i }));
    const viewer: DeskViewer = {
      view: async <T,>(_desk: string, method: string, args?: Record<string, unknown>): Promise<T> => {
        calls.push(`${method}:${String(args?.['from_index'] ?? '-')}`);
        if (method === 'get_config') return { dao: 'd' } as unknown as T;
        if (method === 'get_loans') return (args?.['from_index'] === 0 ? many : [loan({ id: 100 })]) as unknown as T;
        if (method === 'get_members') return [member({ account_id: 'ada.root.testnet' })] as unknown as T;
        return [] as unknown as T;
      },
    };
    const snap = await readDesk(viewer, 'desk.root.testnet');
    expect(snap.loans).toHaveLength(101);
    expect(snap.members).toHaveLength(1);
    expect(calls).toEqual(['get_config:-', 'get_members:0', 'get_loans:0', 'get_loans:100', 'get_requests:0']);
  });
});
