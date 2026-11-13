import { describe, expect, it } from 'vitest';
import { loan, member, NEAR } from '../../../src/lib/fixtures/desk';
import { loanRows, memberRows, timeLeft, waitingRows } from './data';

const NOW = 1_800_000_000_000;

describe('board data', () => {
  it('formats time left', () => {
    expect(timeLeft(NOW + 125_000, NOW)).toBe('2m 05s');
    expect(timeLeft(NOW - 1, NOW)).toBe('expired');
    expect(timeLeft(0, NOW)).toBe('—');
  });
  it('lists only live requests waiting for a co-signer', () => {
    const rows = waitingRows(
      [
        { borrower: 'ada.root.testnet', amount: (6n * NEAR).toString(), gap: (2n * NEAR).toString(), expires_at_ms: NOW + 60_000, expired: false },
        { borrower: 'old.root.testnet', amount: '1', gap: '1', expires_at_ms: NOW - 1, expired: true },
      ],
      NOW,
    );
    expect(rows).toEqual([{ borrower: 'ada.root.testnet', amount: '6 NEAR', gap: '2 NEAR', timeLeft: '1m 00s' }]);
  });
  it('shows newest loans first with their proposal id and live status', () => {
    const rows = loanRows([loan({ id: 0 }), loan({ id: 1, status: 'Active', due_at_ms: NOW + 30_000 })], { 10: 'Approved', 11: 'Approved' }, NOW);
    expect(rows.map((r) => [r.id, r.status, r.timeLeft, r.proposal])).toEqual([
      [1, 'Active', '0m 30s', '#11 Approved'],
      [0, 'Repaid', '—', '#10 Approved'],
    ]);
    expect(rows[1]?.cosigner).toBe('bayo.root.testnet (2 NEAR)');
  });
  it('names the repaid loans behind every standing', () => {
    const rows = memberRows([member({ account_id: 'ada.root.testnet', standing: (5n * NEAR).toString() })], [loan({ id: 0 }), loan({ id: 1, status: 'Defaulted' })]);
    expect(rows[0]).toMatchObject({ account: 'ada.root.testnet', kind: 'member', standing: '5 NEAR', behind: '#0' });
  });
});
