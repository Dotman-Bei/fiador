/**
 * How a member's standing got here, derived from the loan book and the desk's rules (contract/desk/src/repay.rs):
 * on time the borrower gains min(step, principal) and the co-signer min(step, pledge), capped at the maximum;
 * a default sets the borrower to 0 and takes the pledge from the co-signer; a late repayment changes nothing.
 * The desk stores only the current figure, so this is a derivation, and it says whether it reconciles.
 */
import type { DeskParams, LoanView, MemberView } from '../../../src/lib/desk';

export interface TrailStep {
  loanId: number | null;
  text: string;
  delta: bigint | null;
  after: bigint;
  atMs: number | null;
}

export interface Trail {
  steps: TrailStep[];
  derived: bigint;
  read: bigint;
  reconciles: boolean;
}

function grow(standing: bigint, by: bigint, max: bigint): bigint {
  if (standing >= max) return standing;
  const next = standing + by;
  return next < max ? next : max;
}

export function standingTrail(member: MemberView, loans: readonly LoanView[], params: Pick<DeskParams, 'starter_standing' | 'visitor_starter' | 'growth_step' | 'max_standing'>): Trail {
  const step = BigInt(params.growth_step);
  const max = BigInt(params.max_standing);
  const start = BigInt(member.visitor === null ? params.starter_standing : params.visitor_starter);
  const min = (a: bigint, b: bigint): bigint => (a < b ? a : b);
  const steps: TrailStep[] = [
    { loanId: null, text: member.visitor === null ? "the council's grant on admission (today's starter standing)" : "the visitor line's starting standing (today's parameter)", delta: null, after: start, atMs: null },
  ];
  let s = start;
  const mine = loans
    .filter((l) => l.closed_at_ms > 0 && (l.borrower === member.account_id || l.cosigner === member.account_id))
    .sort((a, b) => a.closed_at_ms - b.closed_at_ms || a.id - b.id);
  for (const l of mine) {
    const asBorrower = l.borrower === member.account_id;
    const before = s;
    let text: string;
    if (l.status === 'Repaid') {
      s = grow(s, asBorrower ? min(step, BigInt(l.principal)) : min(step, BigInt(l.pledge)), max);
      text = asBorrower ? 'repaid on time as borrower' : 'co-signed a loan repaid on time';
    } else if (l.status === 'Defaulted') {
      if (asBorrower) {
        s = 0n;
        text = 'defaulted as borrower: standing to 0';
      } else {
        const p = BigInt(l.pledge);
        s = s > p ? s - p : 0n;
        text = 'co-signed a loan that defaulted: lost the pledge';
      }
    } else if (l.status === 'RepaidLate') {
      text = asBorrower ? 'repaid late: no gain, no slash' : 'co-signed a loan repaid late: no change';
    } else {
      text = `${l.status === 'Refused' ? 'refused' : l.status === 'NotFunded' ? 'not funded' : l.status === 'Voided' ? 'voided' : 'closed'}: no change`;
    }
    steps.push({ loanId: l.id, text, delta: s - before, after: s, atMs: l.closed_at_ms });
  }
  const read = BigInt(member.standing);
  return { steps, derived: s, read, reconciles: s === read };
}
