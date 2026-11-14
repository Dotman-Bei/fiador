/** /app/: the board as a hash-routed shell. Every page reads the one live store; nothing needs a wallet. */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import { MemberActions } from '../wallet/MemberActions';
import { ago } from '../data/format';
import { useBoard, useNow } from '../data/react';
import type { BoardView } from '../data/react';
import type { Snapshot } from '../data/reads';
import { useChecksStore } from '../proof/Checks';
import { DeskView } from './pages/Desk';
import { LoanDetailView } from './pages/LoanDetail';
import { LoansView } from './pages/Loans';
import { MemberDetailView, MembersView } from './pages/Members';
import { LINKS, OverviewView, PageHead } from './pages/Overview';
import { RequestsView } from './pages/Requests';
import { useRoute } from './router';
import type { Route } from './router';
import { Search } from './Search';
import { Shell, useRouteEffects } from './Shell';
import type { Tab } from './Shell';
import { Loading, NotFound, NotSeeded, StaleBand, Unavailable } from './states';
import type { Freshness } from './states';

export function freshnessOf(board: BoardView, nowMs: number): Freshness {
  return { phase: board.phase, readAtMs: board.state.lastGoodMs, nowMs };
}

/** The data gate every page shares: not seeded, loading, unavailable, or the page with a stale band when needed. */
export function Gate({ board, nowMs, bootMs, loadingLabel, children }: {
  board: BoardView;
  nowMs: number;
  bootMs: number;
  loadingLabel: string;
  children: (deployment: Deployment, snap: Snapshot) => ReactNode;
}) {
  const { deployment, state, phase } = board;
  if (deployment === null) return <NotSeeded />;
  if (phase === 'loading') return <Loading label={`${loadingLabel} · ${ago(nowMs - bootMs)}`} rows={6} />;
  if (phase === 'unavailable' || state.data === null) return <Unavailable error={state.error ?? ''} rpc={deployment.rpc} onRetry={board.refresh} />;
  return (
    <>
      {phase === 'stale' ? <StaleBand error={state.error} readAtMs={state.data.readAtMs} nowMs={nowMs} onRetry={board.refresh} /> : null}
      {children(deployment, state.data)}
    </>
  );
}

export function tabsFor(snap: Snapshot | null, nowMs: number): Tab[] {
  const waiting = snap === null ? 0 : snap.desk.requests.filter((r) => !r.expired && r.expires_at_ms > nowMs).length;
  return [
    { key: 'overview', label: 'Overview', href: '#/' },
    { key: 'loans', label: 'Loans', href: '#/loans' },
    { key: 'requests', label: 'Requests', href: '#/requests', count: waiting },
    { key: 'members', label: 'Members', href: '#/members' },
    { key: 'desk', label: 'Desk & proof', short: 'Desk', href: '#/desk' },
  ];
}

/** A plain heading while a page has no data yet, so every route still has its h1. */
const TITLE: Partial<Record<Route['name'], string>> = {
  loans: 'Loans',
  loan: 'Loan',
  members: 'Members',
  member: 'Member',
  requests: 'Requests',
  desk: 'Desk and proof',
};

export function App() {
  const route = useRoute();
  const nowMs = useNow();
  const board = useBoard(nowMs);
  const checks = useChecksStore();
  const [bootMs] = useState(() => Date.now());
  useRouteEffects(route);
  // The proof page runs the checks on its first visit; they are then shared with every loan page.
  const checksIdle = checks.state.phase === 'idle';
  useEffect(() => {
    if (route.name === 'desk' && checksIdle) checks.run();
  }, [route.name, checksIdle]);
  const { deployment, state } = board;
  const fresh = freshnessOf(board, nowMs);
  const checkList = checks.state.phase === 'done' ? checks.state.run.checks : null;
  const title = TITLE[route.name];
  const gate = (label: string, body: (d: Deployment, s: Snapshot) => ReactNode): ReactNode => (
    <>
      {state.data === null && title !== undefined ? (
        <h1 className="page-title page-head" data-page-title tabIndex={-1}>
          {title}
        </h1>
      ) : null}
      <Gate board={board} nowMs={nowMs} bootMs={bootMs} loadingLabel={label}>
        {body}
      </Gate>
    </>
  );

  let page: ReactNode;
  switch (route.name) {
    case 'overview':
      page = (
        <>
          {deployment === null ? (
            <h1 className="page-title" data-page-title tabIndex={-1}>
              Fiador board
            </h1>
          ) : (
            <PageHead deployment={deployment} />
          )}
          <Gate board={board} nowMs={nowMs} bootMs={bootMs} loadingLabel="Reading the DAO and the desk from NEAR testnet">
            {(d, s) => <OverviewView deployment={d} snap={s} fresh={fresh} links={LINKS} checks={checkList} />}
          </Gate>
          <MemberActions deployment={deployment} loans={state.data?.desk.loans ?? []} />
        </>
      );
      break;
    case 'loans':
      page = gate('Reading the loan book from NEAR testnet', (d, s) => <LoansView deployment={d} snap={s} fresh={fresh} filters={route.filters} />);
      break;
    case 'loan':
      page = gate(`Reading loan #${route.id} from NEAR testnet`, (d, s) => (
        <LoanDetailView deployment={d} snap={s} fresh={fresh} id={route.id} checks={checks.state} onRunChecks={checks.run} />
      ));
      break;
    case 'members':
      page = gate('Reading the members from NEAR testnet', (d, s) => <MembersView deployment={d} snap={s} fresh={fresh} />);
      break;
    case 'member':
      page = gate('Reading the member from NEAR testnet', (d, s) => <MemberDetailView deployment={d} snap={s} fresh={fresh} account={route.account} />);
      break;
    case 'requests':
      page = (
        <>
          {gate('Reading the requests from NEAR testnet', (d, s) => (
            <RequestsView deployment={d} snap={s} fresh={fresh} />
          ))}
          <MemberActions deployment={deployment} loans={state.data?.desk.loans ?? []} />
        </>
      );
      break;
    case 'desk':
      page = gate('Reading the desk from NEAR testnet', (d, s) => (
        <DeskView deployment={d} snap={s} fresh={fresh} checks={checks.state} onRunChecks={checks.run} />
      ));
      break;
    default:
      page = (
        <NotFound title="This page is not on the board">
          <p>
            The board has no page at <span className="id">{typeof location === 'undefined' ? '' : location.hash}</span>. <a href="#/">Go to the overview</a>.
          </p>
        </NotFound>
      );
  }

  return (
    <Shell route={route} board={board} nowMs={nowMs} tabs={tabsFor(state.data, nowMs)} search={<Search snap={state.data} root={deployment?.root ?? ''} />}>
      {page}
    </Shell>
  );
}
