import type { Account } from 'near-api-js';
import { actProposalArgs, addProposalArgs, parseProposal } from '../../src/lib/sputnik';
import type { Policy, ProposalKindInput, ProposalOutput, VoteAction } from '../../src/lib/sputnik';
import { callTx, requireOk, waitFor } from './near';
import type { TxResult } from './near';

export type CallFn = (receiverId: string, methodName: string, args: Record<string, unknown>, depositYocto: bigint) => Promise<TxResult>;

export interface ViewFn {
  view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>;
}

export function callerFor(account: Account): CallFn {
  return (receiverId, methodName, args, depositYocto) => callTx(account, receiverId, methodName, args, depositYocto);
}

export async function readBond(view: ViewFn, daoId: string): Promise<bigint> {
  const policy = await view.view<Policy>(daoId, 'get_policy');
  return BigInt(policy.proposal_bond);
}

export async function readProposal(view: ViewFn, daoId: string, id: number): Promise<ProposalOutput> {
  return parseProposal(await view.view<unknown>(daoId, 'get_proposal', { id }));
}

/** Polls get_proposal (final finality lags writes) until `done` holds; a not-yet-visible proposal counts as "not yet". */
export async function waitForProposal(
  view: ViewFn,
  daoId: string,
  id: number,
  done: (p: ProposalOutput) => boolean,
  pollMs = 1_500,
  timeoutMs = 45_000,
): Promise<ProposalOutput> {
  const found = await waitFor(
    () => readProposal(view, daoId, id).catch(() => null),
    (p) => p !== null && done(p),
    `proposal ${id} on ${daoId}`,
    timeoutMs,
    pollMs,
  );
  if (found === null) throw new Error(`proposal ${id} on ${daoId} never appeared`);
  return found;
}

/** Files a proposal attaching exactly the policy's bond; returns the id Sputnik returned. */
export async function propose(call: CallFn, view: ViewFn, daoId: string, description: string, kind: ProposalKindInput): Promise<number> {
  const bond = await readBond(view, daoId);
  const value = requireOk(await call(daoId, 'add_proposal', addProposalArgs(description, kind), bond), `add_proposal "${description}"`);
  if (typeof value !== 'number') throw new Error(`add_proposal "${description}" returned ${JSON.stringify(value)}, expected an id`);
  return value;
}

/** Votes after reading the proposal back, echoing its kind exactly as stored (anti-race check on main). */
export async function vote(call: CallFn, view: ViewFn, daoId: string, id: number, action: VoteAction = 'VoteApprove', pollMs = 1_500): Promise<TxResult> {
  const proposal = await waitForProposal(view, daoId, id, () => true, pollMs);
  return call(daoId, 'act_proposal', actProposalArgs(id, action, proposal.kind), 0n);
}

/** One council action: callers[0] proposes, callers[0] and callers[1] approve (2 of 3); must end Approved. */
export async function councilAction(
  callers: readonly CallFn[],
  view: ViewFn,
  daoId: string,
  description: string,
  kind: ProposalKindInput,
  pollMs = 1_500,
): Promise<ProposalOutput> {
  const [first, second] = callers;
  if (first === undefined || second === undefined) throw new Error('councilAction needs at least two council callers');
  const id = await propose(first, view, daoId, description, kind);
  requireOk(await vote(first, view, daoId, id, 'VoteApprove', pollMs), `council vote 1 on ${id}`);
  requireOk(await vote(second, view, daoId, id, 'VoteApprove', pollMs), `council vote 2 on ${id}`);
  const final = await waitForProposal(view, daoId, id, (p) => p.status !== 'InProgress', pollMs);
  if (final.status !== 'Approved') throw new Error(`council action "${description}" ended ${final.status}`);
  return final;
}
