/** Board data: everything comes from public RPC views (no backend, no indexer). */
import { loansBehindStanding, readDesk } from '../../../src/lib/desk';
import type { DeskSnapshot, LoanView, MemberView, RequestView } from '../../../src/lib/desk';
import type { Deployment } from '../../../src/lib/deployments';
import type { RpcClient } from '../../../src/lib/rpc';
import { DESK_ROLE, parseProposal, roleMembers } from '../../../src/lib/sputnik';
import type { Policy, ProposalStatus } from '../../../src/lib/sputnik';
import { formatNear } from '../../../src/lib/units';

export interface BoardData {
  snapshot: DeskSnapshot;
  treasury: { balance: string; available: string };
  seated: boolean;
  frozen: boolean;
  proposals: Record<number, ProposalStatus>;
  loadedAtMs: number;
}

export async function loadBoard(rpc: RpcClient, deployment: Deployment, nowMs: number): Promise<BoardData> {
  const snapshot = await readDesk(rpc, deployment.desk);
  const dao = await rpc.viewAccount(deployment.dao);
  const available = await rpc.view<string>(deployment.dao, 'get_available_amount');
  const policy = await rpc.view<Policy>(deployment.dao, 'get_policy');
  const seat = roleMembers(policy, DESK_ROLE) ?? [];
  const keys = await rpc.accessKeyCount(deployment.desk);
  const proposals: Record<number, ProposalStatus> = {};
  for (const loan of snapshot.loans) {
    if (loan.proposal_id === null || loan.proposal_id in proposals) continue;
    proposals[loan.proposal_id] = parseProposal(await rpc.view<unknown>(deployment.dao, 'get_proposal', { id: loan.proposal_id })).status;
  }
  return {
    snapshot,
    treasury: { balance: dao?.amount ?? '0', available },
    seated: seat.includes(deployment.desk),
    frozen: keys === 0,
    proposals,
    loadedAtMs: nowMs,
  };
}

export function near(yocto: string): string {
  return `${formatNear(yocto)} NEAR`;
}

/** "2m 05s", "expired" or "—" when there is no deadline. */
export function timeLeft(targetMs: number, nowMs: number): string {
  if (targetMs === 0) return '—';
  const s = Math.floor((targetMs - nowMs) / 1000);
  if (s <= 0) return 'expired';
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

export interface WaitingRow {
  borrower: string;
  amount: string;
  gap: string;
  timeLeft: string;
}

export function waitingRows(requests: readonly RequestView[], nowMs: number): WaitingRow[] {
  return requests
    .filter((r) => !r.expired && r.expires_at_ms > nowMs)
    .map((r) => ({ borrower: r.borrower, amount: near(r.amount), gap: near(r.gap), timeLeft: timeLeft(r.expires_at_ms, nowMs) }));
}

export interface LoanRow {
  id: number;
  lane: string;
  borrower: string;
  cosigner: string;
  amount: string;
  status: string;
  timeLeft: string;
  proposal: string;
}

export function loanRows(loans: readonly LoanView[], proposals: Readonly<Record<number, ProposalStatus>>, nowMs: number): LoanRow[] {
  return [...loans].reverse().map((l) => ({
    id: l.id,
    lane: l.lane,
    borrower: l.borrower,
    cosigner: l.cosigner === null ? '—' : `${l.cosigner} (${near(l.pledge)})`,
    amount: near(l.principal),
    status: l.status,
    timeLeft: l.status === 'Active' ? timeLeft(l.due_at_ms, nowMs) : '—',
    proposal: l.proposal_id === null ? '—' : `#${l.proposal_id} ${proposals[l.proposal_id] ?? '…'}`,
  }));
}

export interface MemberRow {
  account: string;
  kind: string;
  standing: string;
  unused: string;
  drawn: string;
  pledged: string;
  behind: string;
}

export function memberRows(members: readonly MemberView[], loans: readonly LoanView[]): MemberRow[] {
  return members.map((m) => {
    const behind = loansBehindStanding(m.account_id, loans).map((l) => `#${l.id}`);
    return {
      account: m.account_id,
      kind: m.visitor === null ? 'member' : 'visitor',
      standing: near(m.standing),
      unused: near(m.unused),
      drawn: near(m.drawn),
      pledged: near(m.pledged),
      behind: behind.length === 0 ? '—' : behind.join(', '),
    };
  });
}
