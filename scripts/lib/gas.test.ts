import { describe, expect, it } from 'vitest';
import { measureChain, recommendedGas } from './gas';

const T = 1_000_000_000_000;
const node = (id: string, executor: string, gas: number, children: string[]) => ({
  id,
  outcome: { executor_id: executor, gas_burnt: gas, receipt_ids: children, status: { SuccessValue: '' }, logs: [] },
});

const OUTCOME = {
  transaction_outcome: { id: 't', outcome: { executor_id: 'root.testnet', gas_burnt: 1, receipt_ids: ['r0'] } },
  receipts_outcome: [
    node('r0', 'smoke.root.testnet', 3 * T, ['r1', 'r2']),
    node('r1', 'fiador.sputnikv2.testnet', 5 * T, ['r1a']),
    node('r1a', 'system', 0, []),
    node('r2', 'smoke.root.testnet', 4 * T, ['r3', 'r4']),
    node('r3', 'fiador.sputnikv2.testnet', 9 * T, ['r3a', 'r3b']),
    node('r3a', 'root.testnet', 0.2 * T, []),
    node('r3b', 'fiador.sputnikv2.testnet', 2 * T, []),
    node('r4', 'smoke.root.testnet', 2 * T, []),
  ],
};

describe('measureChain', () => {
  it('sums each step of the add_proposal → act_proposal chain over its receipt subtree', () => {
    expect(measureChain(OUTCOME, 'fiador.sputnikv2.testnet', 'smoke.root.testnet')).toEqual({
      addProposal: 5_000_000_000_000n,
      onFiled: 17_200_000_000_000n,
      actProposal: 11_200_000_000_000n,
      onVoted: 2_000_000_000_000n,
    });
  });
  it('throws when the chain is incomplete', () => {
    const broken = { ...OUTCOME, receipts_outcome: OUTCOME.receipts_outcome.filter((r) => r.id !== 'r2') };
    expect(() => measureChain(broken, 'fiador.sputnikv2.testnet', 'smoke.root.testnet')).toThrow('gas: no on_filed receipt');
  });
  it('adds at least 30% headroom, rounded up', () => {
    expect(recommendedGas(10n)).toBe(13n);
    expect(recommendedGas(11n)).toBe(15n);
  });
});
