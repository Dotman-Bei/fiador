/** Loans (`#/loans`): every loan, filtered by lane, outcome and member; the filters live in the hash, so a filtered list is a link. */
import { OPEN_STATUSES } from '../../../../src/lib/desk';
import type { LoanStatus, LoanView } from '../../../../src/lib/desk';
import type { Deployment } from '../../../../src/lib/deployments';
import type { Snapshot } from '../../data/reads';
import { shortAccount } from '../../ledger';
import { Segmented } from '../../ui/Segmented';
import { loanRows } from '../data';
import { LoanList } from '../lists';
import { hrefOf } from '../router';
import type { LaneFilter, LoanFilters, StatusFilter } from '../router';
import { Empty, Prov } from '../states';
import type { Freshness } from '../states';
import { LINKS } from './Overview';

const LANE_OPTS: readonly { value: LaneFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'All lanes' },
  { value: 'standing', label: 'Standing' },
  { value: 'cosigned', label: 'Co-signed' },
  { value: 'council', label: 'Council' },
];

const STATUS_OPTS: readonly { value: StatusFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'Any outcome' },
  { value: 'open', label: 'Open' },
  { value: 'repaid', label: 'Repaid' },
  { value: 'late', label: 'Repaid late' },
  { value: 'defaulted', label: 'Defaulted' },
  { value: 'unpaid', label: 'Not paid out' },
];

const LANE_OF: Record<LaneFilter, string> = { standing: 'Standing', cosigned: 'Cosigned', council: 'Council' };

function statusMatch(status: LoanStatus, f: StatusFilter): boolean {
  switch (f) {
    case 'open':
      return OPEN_STATUSES.includes(status);
    case 'repaid':
      return status === 'Repaid';
    case 'late':
      return status === 'RepaidLate';
    case 'defaulted':
      return status === 'Defaulted';
    case 'unpaid':
      return status === 'Refused' || status === 'NotFunded' || status === 'Voided';
  }
}

export function filterLoans(loans: readonly LoanView[], f: LoanFilters): LoanView[] {
  return loans.filter(
    (l) =>
      (f.lane === undefined || l.lane === LANE_OF[f.lane]) &&
      (f.status === undefined || statusMatch(l.status, f.status)) &&
      (f.member === undefined || l.borrower === f.member || l.cosigner === f.member),
  );
}

function go(f: LoanFilters): void {
  location.hash = hrefOf({ name: 'loans', filters: f });
}

export function LoansView({ deployment, snap, fresh, filters }: { deployment: Deployment; snap: Snapshot; fresh: Freshness; filters: LoanFilters }) {
  const clock = fresh.phase === 'stale' ? snap.readAtMs : fresh.nowMs;
  const shown = filterLoans(snap.desk.loans, filters);
  const rows = loanRows(shown, snap.proposals, clock);
  const total = snap.desk.loans.length;
  const any = filters.lane !== undefined || filters.status !== undefined || filters.member !== undefined;
  const without = (k: keyof LoanFilters): LoanFilters => {
    const next = { ...filters };
    delete next[k];
    return next;
  };
  return (
    <>
      <header className="page-head">
        <h1 className="page-title" data-page-title tabIndex={-1}>Loans</h1>
        <p className="page-sub">Every loan on the desk, newest first, with its Sputnik proposal and how it closed.</p>
      </header>
      <div className="filters">
        <div>
          <p className="inst-label">Lane</p>
          <Segmented label="Filter by lane" options={LANE_OPTS} value={filters.lane ?? 'all'} onChange={(v) => go(v === 'all' ? without('lane') : { ...filters, lane: v })} />
        </div>
        <div>
          <p className="inst-label">Outcome</p>
          <Segmented label="Filter by outcome" options={STATUS_OPTS} value={filters.status ?? 'all'} onChange={(v) => go(v === 'all' ? without('status') : { ...filters, status: v })} />
        </div>
      </div>
      <p className="count" role="status">
        {rows.length} of {total} loans
        {filters.member === undefined ? null : (
          <>
            {' · '}borrowed or co-signed by <span className="chip-filter">{shortAccount(filters.member, deployment.root)}</span>{' '}
            <a href={hrefOf({ name: 'loans', filters: without('member') })}>remove</a>
          </>
        )}
        {any ? (
          <>
            {' · '}
            <a href="#/loans">Clear filters</a>
          </>
        ) : null}
      </p>
      {rows.length === 0 ? (
        <Empty>{total === 0 ? 'No loans yet.' : 'No loan matches these filters.'}</Empty>
      ) : (
        <LoanList rows={rows} root={deployment.root} caption="Loans matching the filters, newest first" loanHref={LINKS.loan} memberHref={LINKS.member} />
      )}
      <Prov kind="live" fresh={fresh} />
    </>
  );
}
