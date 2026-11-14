/** How a loan line reads on / and /app/: the stamp ink and words for its status, its lane, and short account names. */
import { OPEN_STATUSES } from '../../src/lib/desk';
import { formatNear } from '../../src/lib/units';

export type Ink = 'repaid' | 'late' | 'default' | 'open' | 'void';

/** The stamp ink for a loan status: repaid on time, repaid late, defaulted, still open, or closed without a payout. */
export function stampInk(status: string): Ink {
  if (status === 'Repaid') return 'repaid';
  if (status === 'RepaidLate') return 'late';
  if (status === 'Defaulted') return 'default';
  if ((OPEN_STATUSES as readonly string[]).includes(status)) return 'open';
  return 'void';
}

/** "RepaidLate" -> "Repaid late", "AwaitingCouncil" -> "Awaiting council". */
export function stampWords(status: string): string {
  const spaced = status.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0) + spaced.slice(1).toLowerCase();
}

export function laneWords(lane: string): string {
  return lane === 'Cosigned' ? 'Co-signed' : lane;
}

/** Accounts under the demo's root account are shown by their first label ("ada-1"); any other account is shown whole. */
export function shortAccount(account: string, root: string): string {
  const suffix = `.${root}`;
  return root !== '' && account.endsWith(suffix) ? account.slice(0, -suffix.length) : account;
}

/** The second line of a passbook entry: how the loan was approved, and who co-signed. Moved from the landing passbook. */
export function entryDetail(loan: { lane: string; cosigner: string | null; pledge: string }, root: string): string {
  if (loan.lane === 'Cosigned' && loan.cosigner !== null) return `co-signed by ${shortAccount(loan.cosigner, root)} for ${formatNear(loan.pledge)} NEAR`;
  return loan.lane === 'Council' ? 'council vote' : 'within standing';
}

/** The Sputnik proposal that paid the loan, or that none was filed. */
export function proposalWords(loan: { proposal_id: number | null }): string {
  return loan.proposal_id === null ? 'no proposal' : `proposal #${loan.proposal_id}`;
}
