/** TypeScript mirror of the desk contract's JSON (contract/desk/src/types.rs). Amounts are yocto strings (U128). */
export type Lane = 'Standing' | 'Cosigned' | 'Council';
export type LoanStatus =
  | 'Filing'
  | 'Voting'
  | 'AwaitingCouncil'
  | 'Active'
  | 'Repaid'
  | 'RepaidLate'
  | 'Defaulted'
  | 'Refused'
  | 'NotFunded'
  | 'Voided';

export interface DeskParams {
  starter_standing: string;
  max_standing: string;
  growth_step: string;
  book_cap: string;
  loan_term_sec: number;
  grace_sec: number;
  request_ttl_sec: number;
  visitor_slots: number;
  visitor_starter: string;
  visitor_window_sec: number;
  visitor_deposit: string;
  proposal_bond: string;
}

export interface ConfigView {
  dao: string;
  params: DeskParams;
  book: string;
  member_count: number;
  loan_count: number;
  request_count: number;
}

export interface SeatView {
  joined_at_ms: number;
  expires_at_ms: number;
  deposit: string;
  loans_taken: number;
}

export interface MemberView {
  account_id: string;
  standing: string;
  drawn: string;
  pledged: string;
  unused: string;
  open_loans: number;
  visitor: SeatView | null;
  repaid_on_time: number;
  defaults: number;
}

export interface LoanView {
  id: number;
  borrower: string;
  principal: string;
  borrower_part: string;
  cosigner: string | null;
  pledge: string;
  lane: Lane;
  status: LoanStatus;
  proposal_id: number | null;
  created_at_ms: number;
  due_at_ms: number;
  closed_at_ms: number;
}

export interface RequestView {
  borrower: string;
  amount: string;
  gap: string;
  expires_at_ms: number;
  expired: boolean;
}

export type AskResult =
  | { Held: { gap: string; expires_at_ms: number } }
  | { Loan: { loan_id: number; status: LoanStatus; proposal_id: number | null } };

export interface DeskViewer {
  view<T>(accountId: string, methodName: string, args?: Record<string, unknown>): Promise<T>;
}

export interface DeskSnapshot {
  config: ConfigView;
  members: MemberView[];
  loans: LoanView[];
  requests: RequestView[];
}

const NEAR = 10n ** 24n;
const PAGE = 100;

/**
 * Demo DAO parameters (spec §6), as the live desk runs them. The live desk was seeded with a 120 s term and 60 s
 * grace; on 2026-11-14 the council raised them to 600 s and 300 s (Sputnik proposal 16, `npm run params`) because a
 * browser-wallet repayment could not land inside two minutes. `npm run seed` deploys a new desk with these values.
 */
export const DEMO_PARAMS: DeskParams = {
  starter_standing: (4n * NEAR).toString(),
  max_standing: (10n * NEAR).toString(),
  growth_step: NEAR.toString(),
  book_cap: (12n * NEAR).toString(),
  loan_term_sec: 600,
  grace_sec: 300,
  request_ttl_sec: 600,
  visitor_slots: 10,
  visitor_starter: (NEAR / 10n).toString(),
  visitor_window_sec: 1800,
  visitor_deposit: (NEAR / 20n).toString(),
  proposal_bond: '0',
};

export const OPEN_STATUSES: readonly LoanStatus[] = ['Filing', 'Voting', 'AwaitingCouncil', 'Active'];

export function isOpen(status: LoanStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Mirrors Desk::holds_reservation: which loans count toward `book`, `drawn` and `pledged`. */
export function holdsReservation(loan: LoanView): boolean {
  if (loan.lane === 'Council') return loan.status === 'Active';
  return loan.status === 'Filing' || loan.status === 'Voting' || loan.status === 'Active';
}

async function paged<T>(read: (from: number, limit: number) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = await read(from, PAGE);
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}

/** Reads the whole desk through its paginated views (no indexer). */
export async function readDesk(viewer: DeskViewer, deskId: string): Promise<DeskSnapshot> {
  const config = await viewer.view<ConfigView>(deskId, 'get_config');
  const members = await paged((from, limit) => viewer.view<MemberView[]>(deskId, 'get_members', { from_index: from, limit }));
  const loans = await paged((from, limit) => viewer.view<LoanView[]>(deskId, 'get_loans', { from_index: from, limit }));
  const requests = await paged((from, limit) => viewer.view<RequestView[]>(deskId, 'get_requests', { from_index: from, limit }));
  return { config, members, loans, requests };
}

/** The repaid loans behind a member's standing: every on-time repayment they borrowed or co-signed. */
export function loansBehindStanding(memberId: string, loans: readonly LoanView[]): LoanView[] {
  return loans.filter((l) => l.status === 'Repaid' && (l.borrower === memberId || (l.cosigner === memberId && BigInt(l.pledge) > 0n)));
}

export function isHeld(result: AskResult): result is { Held: { gap: string; expires_at_ms: number } } {
  return 'Held' in result;
}
