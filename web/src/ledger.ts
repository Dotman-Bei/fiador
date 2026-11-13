/** How a loan line reads on / and /app/: the stamp ink and words for its status, its lane, and short account names. */
import { OPEN_STATUSES } from '../../src/lib/desk';

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
