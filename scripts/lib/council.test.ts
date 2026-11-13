import { describe, expect, it } from 'vitest';
import { councilAction, propose, readBond, vote } from './council';
import type { CallFn, ViewFn } from './council';
import type { TxResult } from './near';

const KIND = { Transfer: { token_id: '', receiver_id: 'bob.testnet', amount: '5', msg: null } };
const okResult = (value: unknown): TxResult => ({ ok: true, failures: [], value, raw: null });

function fakeView(state: { bond: string; status: string[] }): ViewFn {
  let reads = 0;
  return {
    view: async <T,>(_account: string, method: string): Promise<T> => {
      if (method === 'get_policy') return { proposal_bond: state.bond } as unknown as T;
      const status = state.status[Math.min(reads, state.status.length - 1)] ?? 'InProgress';
      reads += 1;
      return { id: 4, proposer: 'c1', description: 'd', kind: KIND, status, vote_counts: {}, votes: {}, submission_time: '1' } as unknown as T;
    },
  };
}

describe('council helpers', () => {
  it('reads the bond from get_policy', async () => {
    await expect(readBond(fakeView({ bond: '1000', status: [] }), 'dao')).resolves.toBe(1000n);
  });

  it('attaches exactly the policy bond and returns the new id', async () => {
    const calls: Array<{ method: string; deposit: bigint; args: Record<string, unknown> }> = [];
    const call: CallFn = async (_r, method, args, deposit) => {
      calls.push({ method, deposit, args });
      return okResult(4);
    };
    await expect(propose(call, fakeView({ bond: '7', status: [] }), 'dao', 'd', 'Vote')).resolves.toBe(4);
    expect(calls).toEqual([{ method: 'add_proposal', deposit: 7n, args: { proposal: { description: 'd', kind: 'Vote' } } }]);
  });

  it('echoes the kind read back from get_proposal when voting', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const call: CallFn = async (_r, _m, args) => {
      calls.push(args);
      return okResult(null);
    };
    await vote(call, fakeView({ bond: '0', status: ['InProgress'] }), 'dao', 4, 'VoteApprove', 1);
    expect(calls).toEqual([{ id: 4, action: 'VoteApprove', proposal: KIND }]);
  });

  it('runs a 2-of-3 council action and returns the approved proposal', async () => {
    const seen: string[] = [];
    const mk = (name: string): CallFn => async (_r, method) => {
      seen.push(`${name}:${method}`);
      return okResult(method === 'add_proposal' ? 4 : null);
    };
    const view = fakeView({ bond: '0', status: ['InProgress', 'InProgress', 'InProgress', 'Approved'] });
    const result = await councilAction([mk('c1'), mk('c2'), mk('c3')], view, 'dao', 'd', 'Vote', 1);
    expect(result.status).toBe('Approved');
    expect(seen).toEqual(['c1:add_proposal', 'c1:act_proposal', 'c2:act_proposal']);
  });

  it('fails a council action that does not reach Approved', async () => {
    const call: CallFn = async (_r, method) => okResult(method === 'add_proposal' ? 4 : null);
    const view = fakeView({ bond: '0', status: ['InProgress', 'InProgress', 'InProgress', 'Failed'] });
    await expect(councilAction([call, call], view, 'dao', 'd', 'Vote', 1)).rejects.toThrow('council action "d" ended Failed');
  });
});
