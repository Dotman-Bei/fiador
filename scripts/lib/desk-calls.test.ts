import { describe, expect, it } from 'vitest';
import type { CallFn } from './council';
import { ask, cosign, loanIdOf, parseAskResult, repay } from './desk-calls';
import type { TxResult } from './near';

const ok = (value: unknown): TxResult => ({ ok: true, failures: [], value, raw: null });

describe('desk calls', () => {
  it('parses both AskResult shapes', () => {
    expect(parseAskResult({ Held: { gap: '2', expires_at_ms: 5 } })).toEqual({ Held: { gap: '2', expires_at_ms: 5 } });
    expect(parseAskResult({ Loan: { loan_id: 3, status: 'Active', proposal_id: 9 } })).toEqual({ Loan: { loan_id: 3, status: 'Active', proposal_id: 9 } });
    expect(parseAskResult({ Loan: { loan_id: 4, status: 'Refused', proposal_id: null } })).toEqual({ Loan: { loan_id: 4, status: 'Refused', proposal_id: null } });
    expect(() => parseAskResult({ nope: 1 })).toThrow('not an AskResult');
  });

  it('sends yocto strings and returns the parsed result', async () => {
    const sent: Array<[string, string, Record<string, unknown>, bigint]> = [];
    const call: CallFn = async (r, m, a, d) => {
      sent.push([r, m, a, d]);
      return ok({ Held: { gap: '2000000000000000000000000', expires_at_ms: 9 } });
    };
    const { result } = await ask(call, 'desk.r.testnet', 6n * 10n ** 24n);
    expect(sent[0]).toEqual(['desk.r.testnet', 'ask', { amount: '6000000000000000000000000' }, 0n]);
    expect(() => loanIdOf(result)).toThrow('the desk held the request');
  });

  it('co-signs with a max pledge and repays with the exact principal attached', async () => {
    const sent: Array<[string, Record<string, unknown>, bigint]> = [];
    const call: CallFn = async (_r, m, a, d) => {
      sent.push([m, a, d]);
      return ok(m === 'cosign' ? { Loan: { loan_id: 7, status: 'Active', proposal_id: 12 } } : null);
    };
    const { result } = await cosign(call, 'desk', 'ada.r.testnet', 2n);
    expect(loanIdOf(result)).toBe(7);
    await repay(call, 'desk', 7, 6n);
    expect(sent).toEqual([
      ['cosign', { borrower: 'ada.r.testnet', max_pledge: '2' }, 0n],
      ['repay', { loan_id: 7 }, 6n],
    ]);
  });

  it('surfaces a failed ask', async () => {
    const call: CallFn = async () => ({ ok: false, failures: ['desk: ERR_BOOK_FULL'], value: null, raw: null });
    await expect(ask(call, 'desk', 1n)).rejects.toThrow('ask failed: desk: ERR_BOOK_FULL');
  });
});
