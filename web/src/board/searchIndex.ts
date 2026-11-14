/** Search over the loaded snapshot only (no network): loans by number, proposals by number, members by name, outcomes by word. */
import type { Snapshot } from '../data/reads';
import { near } from '../data/format';
import { shortAccount, stampWords } from '../ledger';

export interface Hit {
  group: 'Loans' | 'Members';
  label: string;
  detail: string;
  href: string;
}

const MAX = 8;

export function search(snap: Snapshot, root: string, raw: string): Hit[] {
  const q = raw.trim().toLowerCase();
  if (q.length === 0) return [];
  const hits: Hit[] = [];
  const loanHit = (id: number, why: string): void => {
    const l = snap.desk.loans.find((x) => x.id === id);
    if (l === undefined || hits.some((h) => h.href === `#/loans/${id}`)) return;
    hits.push({ group: 'Loans', label: `Loan #${l.id}`, detail: `${shortAccount(l.borrower, root)} · ${near(l.principal)} · ${stampWords(l.status)}${why}`, href: `#/loans/${l.id}` });
  };
  const num = /^(?:#|loan\s*#?)?(\d+)$/.exec(q);
  if (num?.[1] !== undefined) loanHit(Number(num[1]), '');
  const prop = /^(?:p|proposal\s*#?)(\d+)$/.exec(q);
  if (prop?.[1] !== undefined) {
    const id = Number(prop[1]);
    const l = snap.desk.loans.find((x) => x.proposal_id === id);
    if (l !== undefined) loanHit(l.id, ` · proposal #${id}`);
  }
  for (const m of snap.desk.members) {
    const short = shortAccount(m.account_id, root).toLowerCase();
    if (short.includes(q) || m.account_id.toLowerCase().includes(q)) {
      hits.push({ group: 'Members', label: shortAccount(m.account_id, root), detail: `${m.visitor === null ? 'member' : 'visitor'} · standing ${near(m.standing)}`, href: `#/members/${encodeURIComponent(m.account_id)}` });
    }
  }
  if (q.length >= 3) {
    for (const l of [...snap.desk.loans].sort((a, b) => b.id - a.id)) {
      if (stampWords(l.status).toLowerCase().startsWith(q) || l.lane.toLowerCase().startsWith(q)) loanHit(l.id, '');
    }
  }
  return hits.slice(0, MAX);
}
