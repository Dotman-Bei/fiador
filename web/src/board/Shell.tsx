/** The board's shell: testnet line, topbar with index tabs and the status chip, a phone tab bar, the footer. */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { REPO_URL } from '../deployment';
import { ago, utcTime } from '../data/format';
import { errorWords } from '../data/store';
import type { BoardView } from '../data/react';
import { tabOf } from './router';
import type { Route } from './router';

export interface Tab {
  key: string;
  label: string;
  href: string;
  /** Shown beside the label when above zero (Requests waiting). */
  count?: number;
  /** A shorter label for the phone tab bar. */
  short?: string;
}

/** The routes this build ships; a tab appears in the stage that builds its page. */
export const TABS: readonly Tab[] = [{ key: 'overview', label: 'Overview', href: '#/' }];

/** Where "What this means" points: the board's proof page. */
export const FACTS_HREF = '#/desk';

const CHIP: Record<BoardView['phase'], string> = {
  unseeded: 'Not seeded',
  loading: 'Reading…',
  live: 'Live',
  stale: 'Stale',
  unavailable: 'Unavailable',
};

const PHASE_WORDS: Record<BoardView['phase'], string> = {
  unseeded: 'The demo DAO is not seeded in this build.',
  loading: 'Reading NEAR testnet.',
  live: 'Board is live.',
  stale: 'Board data is stale: the latest read failed.',
  unavailable: 'NEAR testnet could not be read.',
};

function StatusChip({ board, nowMs }: { board: BoardView; nowMs: number }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const { phase, state, deployment } = board;
  const age = state.lastGoodMs === null ? null : ago(nowMs - state.lastGoodMs);
  const label = (phase === 'live' || phase === 'stale') && age !== null ? `${CHIP[phase]} · ${age}` : CHIP[phase];
  return (
    <div className="status">
      <button
        ref={btn}
        type="button"
        className={`chip chip-${phase}`}
        aria-expanded={open}
        aria-controls="status-panel"
        aria-label={`Data status: ${label}. Show details`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="chip-mark" aria-hidden="true" />
        {label}
      </button>
      {open ? (
        <div
          id="status-panel"
          className="status-panel"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              btn.current?.focus();
            }
          }}
        >
          <p>
            Reads NEAR testnet through <span className="id">{deployment?.rpc ?? 'no endpoint (not seeded)'}</span>, every 5 seconds while this tab is open.
          </p>
          <p>Last good read: {state.lastGoodMs === null ? 'none yet' : `${utcTime(state.lastGoodMs)} (${age ?? ''} ago)`}</p>
          {state.error === null ? null : <p className="signal">Last error: {errorWords(state.error)}</p>}
          <p>
            <button type="button" className="btn btn-quiet btn-sm" onClick={board.refresh} disabled={state.reading}>
              {state.reading ? 'Reading…' : 'Retry now'}
            </button>
          </p>
        </div>
      ) : null}
      <p className="vh" role="status">{PHASE_WORDS[phase]}</p>
    </div>
  );
}

function Tabs({ route, tabs, className, label, short = false }: { route: Route; tabs: readonly Tab[]; className: string; label: string; short?: boolean }) {
  const current = tabOf(route);
  return (
    <nav className={className} aria-label={label}>
      <ul>
        {tabs.map((t) => (
          <li key={t.key}>
            <a href={t.href} aria-current={t.key === current ? 'page' : undefined}>
              {short ? t.short ?? t.label : t.label}
              {t.count !== undefined && t.count > 0 ? (
                <span className="tab-count">
                  {t.count}
                  <span className="vh"> waiting</span>
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Shell({ route, board, nowMs, tabs = TABS, factsHref = FACTS_HREF, search, children }: {
  route: Route;
  board: BoardView;
  nowMs: number;
  tabs?: readonly Tab[];
  factsHref?: string;
  search?: ReactNode;
  children: ReactNode;
}) {
  const main = useRef<HTMLElement>(null);
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <div className="testnet-line">
        <div className="wrap wrap-app testnet-row">
          <p>
            <span className="testnet-long">Testnet only · unaudited · not real money · the desk is frozen, with no access keys · the council is three scripted accounts sharing one operator key</span>
            <span className="testnet-short">Testnet only · unaudited</span>
          </p>
          <a href={factsHref}>What this means</a>
        </div>
      </div>
      <header className="topbar">
        <div className="wrap wrap-app topbar-row">
          <a className="wordmark" href="../">Fiador</a>
          <Tabs route={route} tabs={tabs} className="tabs" label="Board" />
          <div className="topbar-tools">
            {search}
            <StatusChip board={board} nowMs={nowMs} />
          </div>
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1} className="wrap wrap-app board-main">
        {children}
      </main>
      <footer className="board-foot">
        <div className="wrap wrap-app">
          <p>
            Built at NEAR HACKATHON 2026. Testnet only, unaudited. <a href="../">About Fiador</a> · <a href={REPO_URL}>Source on GitHub</a>
          </p>
        </div>
      </footer>
      {tabs.length > 1 ? <Tabs route={route} tabs={tabs} className="tabbar" label="Board, phone" short /> : null}
    </>
  );
}

const TITLES: Record<Route['name'], string> = {
  overview: 'Fiador board',
  loans: 'Loans · Fiador board',
  loan: 'Loan · Fiador board',
  requests: 'Requests · Fiador board',
  members: 'Members · Fiador board',
  member: 'Member · Fiador board',
  desk: 'Desk and proof · Fiador board',
  states: 'State gallery · Fiador board',
  notfound: 'Not found · Fiador board',
};

export function titleOf(route: Route): string {
  if (route.name === 'loan') return `Loan #${route.id} · Fiador board`;
  if (route.name === 'member') return `${route.account.split('.')[0] ?? route.account} · Fiador board`;
  return TITLES[route.name];
}

/**
 * After a navigation (not the first paint): top of the page, focus on the page title, the document title.
 * A filter change on the same list keeps focus where it is, so arrow keys in a filter keep working.
 */
export function useRouteEffects(route: Route): void {
  const first = useRef(true);
  const prev = useRef<Route['name']>(route.name);
  const key = JSON.stringify(route);
  useEffect(() => {
    document.title = titleOf(route);
    const sameList = prev.current === route.name && route.name === 'loans';
    prev.current = route.name;
    if (first.current) {
      first.current = false;
      return;
    }
    if (sameList) return;
    window.scrollTo(0, 0);
    const h = document.querySelector<HTMLElement>('[data-page-title]');
    h?.focus({ preventScroll: true });
  }, [key]);
}
