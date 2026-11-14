/** /app/: the board as a hash-routed shell. Every page reads the one live store; nothing needs a wallet. */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { MemberActions } from '../wallet/MemberActions';
import { ago } from '../data/format';
import { useBoard, useNow } from '../data/react';
import type { BoardView } from '../data/react';
import { NO_LINKS, OverviewView, PageHead } from './pages/Overview';
import { useRoute } from './router';
import { Shell, useRouteEffects } from './Shell';
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
  children: () => ReactNode;
}) {
  const { deployment, state, phase } = board;
  if (deployment === null) return <NotSeeded />;
  if (phase === 'loading') return <Loading label={`${loadingLabel} · ${ago(nowMs - bootMs)}`} rows={6} />;
  if (phase === 'unavailable' || state.data === null) return <Unavailable error={state.error ?? ''} rpc={deployment.rpc} onRetry={board.refresh} />;
  return (
    <>
      {phase === 'stale' ? <StaleBand error={state.error} readAtMs={state.data.readAtMs} nowMs={nowMs} onRetry={board.refresh} /> : null}
      {children()}
    </>
  );
}

export function App() {
  const route = useRoute();
  const nowMs = useNow();
  const board = useBoard(nowMs);
  const [bootMs] = useState(() => Date.now());
  useRouteEffects(route);
  const { deployment } = board;
  const fresh = freshnessOf(board, nowMs);

  let page: ReactNode;
  if (route.name === 'overview') {
    page = (
      <>
        {deployment === null ? <h1 className="page-title" data-page-title tabIndex={-1}>Fiador board</h1> : <PageHead deployment={deployment} />}
        <Gate board={board} nowMs={nowMs} bootMs={bootMs} loadingLabel="Reading the DAO and the desk from NEAR testnet">
          {() => (deployment === null || board.state.data === null ? null : <OverviewView deployment={deployment} snap={board.state.data} fresh={fresh} links={NO_LINKS} />)}
        </Gate>
        <MemberActions deployment={deployment} />
      </>
    );
  } else {
    page = (
      <NotFound title="This page is not on the board">
        <p>
          The board has no page at <span className="id">{location.hash}</span>. <a href="#/">Go to the overview</a>.
        </p>
      </NotFound>
    );
  }

  return (
    <Shell route={route} board={board} nowMs={nowMs}>
      {page}
    </Shell>
  );
}
