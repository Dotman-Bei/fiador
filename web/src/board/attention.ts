/** What needs a hand, most urgent first, from the snapshot alone (and the checks, when they ran). */
import type { Deployment } from '../../../src/lib/deployments';
import { DESK_ROLE, roleMembers } from '../../../src/lib/sputnik';
import type { Check } from '../../../src/lib/verify';
import type { Snapshot } from '../data/reads';
import { countdown, near, utcTime } from '../data/format';
import { shortAccount } from '../ledger';

export type Severity = 'critical' | 'act' | 'watch';

export interface Attention {
  key: string;
  severity: Severity;
  text: string;
  href: string;
  action: string;
}

const RANK: Record<Severity, number> = { critical: 0, act: 1, watch: 2 };

export function attentionItems(snap: Snapshot, deployment: Deployment, nowMs: number, checks: readonly Check[] | null = null): Attention[] {
  const out: (Attention & { order: number })[] = [];
  const name = (a: string): string => shortAccount(a, deployment.root);
  const graceMs = snap.desk.config.params.grace_sec * 1000;

  if (!(roleMembers(snap.policy, DESK_ROLE) ?? []).includes(deployment.desk)) {
    out.push({ key: 'unseated', severity: 'critical', order: 0, text: "The desk is not in the DAO's policy: Sputnik will refuse every ask until the council seats it again.", href: '#/desk', action: 'See the seat' });
  }
  if (snap.deskKeys > 0) {
    out.push({ key: 'keys', severity: 'critical', order: 0, text: `The desk has ${snap.deskKeys} access key(s): it is not keyless, so someone could still change it.`, href: '#/desk', action: 'See the keys' });
  }
  const failed = checks?.filter((c) => !c.ok) ?? [];
  if (failed.length > 0) {
    out.push({ key: 'checks', severity: 'critical', order: 0, text: `${failed.length} of the desk's checks failed: ${failed[0]?.name ?? ''}.`, href: '#/desk', action: 'See the checks' });
  }

  for (const l of snap.desk.loans) {
    if (l.status === 'Active') {
      const graceEnd = l.due_at_ms + graceMs;
      if (nowMs > graceEnd) {
        out.push({ key: `overdue-${l.id}`, severity: 'act', order: graceEnd, text: `Loan #${l.id} (${name(l.borrower)}, ${near(l.principal)}) is past its grace period since ${utcTime(graceEnd)}: anyone may mark it defaulted.`, href: `#/loans/${l.id}`, action: 'Open the loan' });
      } else if (nowMs > l.due_at_ms) {
        out.push({ key: `grace-${l.id}`, severity: 'act', order: graceEnd, text: `Loan #${l.id} (${name(l.borrower)}) is in its grace period for ${countdown(graceEnd, nowMs)}: repaying now closes it with no gain and no slash.`, href: `#/loans/${l.id}`, action: 'Open the loan' });
      } else {
        out.push({ key: `due-${l.id}`, severity: 'watch', order: l.due_at_ms, text: `Loan #${l.id} (${name(l.borrower)}, ${near(l.principal)}) is due in ${countdown(l.due_at_ms, nowMs)}.`, href: `#/loans/${l.id}`, action: 'Open the loan' });
      }
    } else if (l.status === 'AwaitingCouncil' || ((l.status === 'Filing' || l.status === 'Voting') && l.lane === 'Council')) {
      const p = l.proposal_id === null ? undefined : snap.proposals[l.proposal_id];
      const votes = p === undefined ? null : Object.entries(p.votes).filter(([who, v]) => v === 'Approve' && deployment.council.includes(who)).length;
      out.push({ key: `council-${l.id}`, severity: 'watch', order: l.created_at_ms, text: `Loan #${l.id} (${name(l.borrower)}, ${near(l.principal)}) waits for the council${votes === null ? '' : `: ${votes} of 2 approvals`}.`, href: `#/loans/${l.id}`, action: 'Open the loan' });
    }
  }

  for (const r of snap.desk.requests) {
    if (r.expired || r.expires_at_ms <= nowMs) continue;
    out.push({ key: `request-${r.borrower}`, severity: 'act', order: r.expires_at_ms, text: `${name(r.borrower)} asked ${near(r.amount)} and needs ${near(r.gap)} co-signed · ${countdown(r.expires_at_ms, nowMs)} left.`, href: '#/requests', action: 'See the request' });
  }

  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.order - b.order).map(({ order: _order, ...item }) => item);
}

/** The most recent thing that happened on the desk, for the empty queue. */
export function lastMovement(snap: Snapshot): string | null {
  let best: { at: number; text: string } | null = null;
  for (const l of snap.desk.loans) {
    const closed = l.closed_at_ms > 0 ? { at: l.closed_at_ms, text: `loan #${l.id} ${l.status === 'Repaid' ? 'repaid' : l.status === 'RepaidLate' ? 'repaid late' : l.status === 'Defaulted' ? 'defaulted' : l.status === 'Refused' ? 'refused' : 'closed'} at ${utcTime(l.closed_at_ms)}` } : null;
    const opened = { at: l.created_at_ms, text: `loan #${l.id} opened at ${utcTime(l.created_at_ms)}` };
    for (const e of [closed, opened]) if (e !== null && (best === null || e.at > best.at)) best = e;
  }
  return best === null ? null : best.text;
}
