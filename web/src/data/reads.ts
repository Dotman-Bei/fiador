/**
 * Every read the board makes, through public RPC only (no backend, no indexer).
 * Independent reads run in parallel; the proposals of closed loans are cached once read.
 */
import { isOpen } from '../../../src/lib/desk';
import type { ConfigView, DeskSnapshot, LoanView, MemberView, RequestView } from '../../../src/lib/desk';
import type { Deployment } from '../../../src/lib/deployments';
import type { AccountInfo } from '../../../src/lib/rpc';
import { parseProposal } from '../../../src/lib/sputnik';
import type { Policy, ProposalOutput } from '../../../src/lib/sputnik';

/** What the board needs from an RPC client (RpcClient satisfies it; tests pass a fake). */
export interface Reader {
  view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>;
  viewAccount(accountId: string): Promise<AccountInfo | null>;
  accessKeyCount(accountId: string): Promise<number>;
}

const PAGE = 100;

async function paged<T>(read: (from: number, limit: number) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = await read(from, PAGE);
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}

/** The desk's paginated views, the four lists read side by side (src/lib/desk.ts readDesk reads them one after another). */
export async function readDeskParallel(reader: Reader, deskId: string): Promise<DeskSnapshot> {
  const [config, members, loans, requests] = await Promise.all([
    reader.view<ConfigView>(deskId, 'get_config'),
    paged((from, limit) => reader.view<MemberView[]>(deskId, 'get_members', { from_index: from, limit })),
    paged((from, limit) => reader.view<LoanView[]>(deskId, 'get_loans', { from_index: from, limit })),
    paged((from, limit) => reader.view<RequestView[]>(deskId, 'get_requests', { from_index: from, limit })),
  ]);
  return { config, members, loans, requests };
}

export interface Snapshot {
  desk: DeskSnapshot;
  /** null: the DAO account does not exist on this network (shown as unavailable, never as 0 NEAR). */
  daoAccount: AccountInfo | null;
  /** The DAO's get_available_amount: what the treasury can spend after its storage. */
  spendable: string;
  policy: Policy;
  deskKeys: number;
  proposals: Record<number, ProposalOutput>;
  /** Proposal ids whose read failed in this snapshot (their cells say so). */
  proposalErrors: number[];
  readAtMs: number;
}

/** A proposal can no longer change once its loan is closed and Sputnik has finished with it. */
export function isSettled(loan: LoanView, proposal: ProposalOutput): boolean {
  return !isOpen(loan.status) && proposal.status !== 'InProgress';
}

export async function readSnapshot(
  reader: Reader,
  deployment: Deployment,
  nowMs: number,
  cache: Map<number, ProposalOutput> = new Map(),
): Promise<Snapshot> {
  const [desk, daoAccount, spendable, policy, deskKeys] = await Promise.all([
    readDeskParallel(reader, deployment.desk),
    reader.viewAccount(deployment.dao),
    reader.view<string>(deployment.dao, 'get_available_amount'),
    reader.view<Policy>(deployment.dao, 'get_policy'),
    reader.accessKeyCount(deployment.desk),
  ]);
  const proposals: Record<number, ProposalOutput> = {};
  const proposalErrors: number[] = [];
  const wanted = new Map<number, LoanView>();
  for (const loan of desk.loans) if (loan.proposal_id !== null) wanted.set(loan.proposal_id, loan);
  await Promise.all(
    [...wanted].map(async ([id, loan]) => {
      const cached = cache.get(id);
      if (cached !== undefined) {
        proposals[id] = cached;
        return;
      }
      try {
        const p = parseProposal(await reader.view<unknown>(deployment.dao, 'get_proposal', { id }));
        proposals[id] = p;
        if (isSettled(loan, p)) cache.set(id, p);
      } catch {
        proposalErrors.push(id);
      }
    }),
  );
  proposalErrors.sort((a, b) => a - b);
  return { desk, daoAccount, spendable, policy, deskKeys, proposals, proposalErrors, readAtMs: nowMs };
}
