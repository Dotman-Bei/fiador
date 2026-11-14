/** Pure helpers for `npm run params`: change only the loan term and grace in a full desk Params set. */
import type { DeskParams } from '../../src/lib/desk';

const KEYS: readonly (keyof DeskParams)[] = [
  'starter_standing',
  'max_standing',
  'growth_step',
  'book_cap',
  'loan_term_sec',
  'grace_sec',
  'request_ttl_sec',
  'visitor_slots',
  'visitor_starter',
  'visitor_window_sec',
  'visitor_deposit',
  'proposal_bond',
];

export function parseSeconds(name: string, value: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`--${name} must be a whole number of seconds`);
  const n = Number(value);
  if (n < 1 || n > 86_400) throw new Error(`--${name} must be between 1 and 86400 seconds`);
  return n;
}

/** Copies the live params exactly (all 12 fields, nothing else) with only the term and grace replaced. */
export function retime(live: DeskParams, loanTermSec: number, graceSec: number): DeskParams {
  const extra = Object.keys(live).filter((k) => !(KEYS as readonly string[]).includes(k));
  const missing = KEYS.filter((k) => !(k in live));
  if (extra.length > 0 || missing.length > 0) {
    throw new Error(`the live params do not have the expected shape (extra: ${extra.join(',') || 'none'}; missing: ${missing.join(',') || 'none'})`);
  }
  const out = {} as Record<keyof DeskParams, unknown>;
  for (const k of KEYS) out[k] = live[k];
  return { ...(out as unknown as DeskParams), loan_term_sec: loanTermSec, grace_sec: graceSec };
}

/** The fields whose values differ, as `name: before -> after`. */
export function changedFields(before: DeskParams, after: DeskParams): string[] {
  return KEYS.filter((k) => before[k] !== after[k]).map((k) => `${k}: ${String(before[k])} -> ${String(after[k])}`);
}
