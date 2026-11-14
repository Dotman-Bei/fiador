/** Board rows: pure shaping of the snapshot that web/src/data/reads.ts reads from public RPC (no backend, no indexer). */
import { holdsReservation, loansBehindStanding } from '../../../src/lib/desk';
import type { Lane, LoanStatus, LoanView, MemberView, RequestView } from '../../../src/lib/desk';
import type { ProposalOutput, ProposalStatus } from '../../../src/lib/sputnik';
import { countdown, near } from '../data/format';

export { near };

/** "2m 05s", "expired" or "—" when there is no deadline. */
export function timeLeft(targetMs: number, nowMs: number): string {
  return countdown(targetMs, nowMs);
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
  /** Structured fields for links and slips. */
  laneKey: Lane;
  statusKey: LoanStatus;
  cosignerAccount: string | null;
  pledge: string;
  proposalId: number | null;
  proposalStatus: ProposalStatus | null;
  closedAtMs: number;
  dueAtMs: number;
}

export function loanRows(
  loans: readonly LoanView[],
  proposals: Readonly<Record<number, ProposalStatus | ProposalOutput>>,
  nowMs: number,
): LoanRow[] {
  return [...loans].reverse().map((l) => {
    const p = l.proposal_id === null ? undefined : proposals[l.proposal_id];
    const proposalStatus = p === undefined ? null : typeof p === 'string' ? p : p.status;
    return {
      id: l.id,
      lane: l.lane,
      borrower: l.borrower,
      cosigner: l.cosigner === null ? '—' : `${l.cosigner} (${near(l.pledge)})`,
      amount: near(l.principal),
      status: l.status,
      timeLeft: l.status === 'Active' ? timeLeft(l.due_at_ms, nowMs) : '—',
      proposal: l.proposal_id === null ? '—' : `#${l.proposal_id} ${proposalStatus ?? 'status unavailable'}`,
      laneKey: l.lane,
      statusKey: l.status,
      cosignerAccount: l.cosigner,
      pledge: near(l.pledge),
      proposalId: l.proposal_id,
      proposalStatus,
      closedAtMs: l.closed_at_ms,
      dueAtMs: l.due_at_ms,
    };
  });
}

export interface MemberRow {
  account: string;
  kind: string;
  standing: string;
  unused: string;
  drawn: string;
  pledged: string;
  behind: string;
  behindIds: number[];
  repaidOnTime: number;
  defaults: number;
}

export function memberRows(members: readonly MemberView[], loans: readonly LoanView[]): MemberRow[] {
  return members.map((m) => {
    const behindIds = loansBehindStanding(m.account_id, loans).map((l) => l.id);
    return {
      account: m.account_id,
      kind: m.visitor === null ? 'member' : 'visitor',
      standing: near(m.standing),
      unused: near(m.unused),
      drawn: near(m.drawn),
      pledged: near(m.pledged),
      behind: behindIds.length === 0 ? '—' : behindIds.map((id) => `#${id}`).join(', '),
      behindIds,
      repaidOnTime: m.repaid_on_time,
      defaults: m.defaults,
    };
  });
}

/** The open loans that hold book room, for the book bar. */
export function bookSegments(loans: readonly LoanView[]): { id: number; principal: bigint }[] {
  return loans.filter(holdsReservation).map((l) => ({ id: l.id, principal: BigInt(l.principal) }));
}

/** Room to lend now: the smaller of the room under the book cap and what the treasury can spend. */
export function roomToLend(bookCap: string, book: string, spendable: string): bigint {
  const capRoom = BigInt(bookCap) - BigInt(book);
  const s = BigInt(spendable);
  const room = capRoom < s ? capRoom : s;
  return room < 0n ? 0n : room;
}
