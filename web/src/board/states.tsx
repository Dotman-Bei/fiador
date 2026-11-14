/** The board's data states and provenance tags (docs/design/UX_AUDIT_AND_REDESIGN_PROPOSAL.md, section 7). */
import type { ReactNode } from 'react';
import type { Phase } from '../data/store';
import { errorWords } from '../data/store';
import { ago, utcTime } from '../data/format';

/** What a view needs to label its figures: the phase and the age of the snapshot on screen. */
export interface Freshness {
  phase: Phase;
  readAtMs: number | null;
  nowMs: number;
}

export type ProvKind = 'live' | 'derived' | 'rules' | 'recorded' | 'fixture' | 'illustrative';

/** A provenance tag: words plus a shape, never color alone. */
export function Prov({ kind, fresh, children }: { kind: ProvKind; fresh?: Freshness; children?: ReactNode }) {
  if (kind === 'live') {
    const stale = fresh?.phase === 'stale';
    const age = fresh?.readAtMs == null ? null : ago(fresh.nowMs - fresh.readAtMs);
    return (
      <p className={`prov ${stale ? 'prov-stale' : 'prov-live'}`}>
        <span className="prov-mark" aria-hidden="true" />
        {stale ? 'Stale' : 'Live'}
        {age === null ? null : stale ? ` · last good read ${age} ago` : ` · read from NEAR testnet ${age} ago`}
        {children === undefined ? null : <> · {children}</>}
      </p>
    );
  }
  const word = { derived: 'Derived', rules: 'Rules', recorded: 'Recorded', fixture: 'Fixture', illustrative: 'Illustrative' }[kind];
  return (
    <p className={`prov prov-${kind}`}>
      <span className="prov-mark" aria-hidden="true" />
      {word}
      {children === undefined ? null : <> · {children}</>}
    </p>
  );
}

export function NotSeeded() {
  return (
    <section className="state-panel" aria-labelledby="unseeded">
      <h2 id="unseeded">The demo DAO has not been seeded in this build</h2>
      <p>deployments/testnet.json is missing, so there is no DAO or desk to read. Run the seed (README, Deploy) and rebuild.</p>
    </section>
  );
}

export function Unavailable({ error, rpc, onRetry }: { error: string; rpc: string; onRetry: () => void }) {
  return (
    <section className="state-panel state-signal" aria-labelledby="unavailable" role="alert">
      <h2 id="unavailable">NEAR testnet could not be read</h2>
      <p>
        Reason: {errorWords(error)}. Nothing below is shown until a read succeeds, so an empty page here never means an empty desk.
      </p>
      <p>
        <button type="button" className="btn" onClick={onRetry}>Retry now</button>
      </p>
      <p className="muted">
        Endpoint <span className="id">{rpc}</span>. Without a browser, <code>npm run verify</code> reads the same desk from the command line.
      </p>
      <details className="raw">
        <summary>Raw error</summary>
        <p className="id">{error}</p>
      </details>
    </section>
  );
}

export function StaleBand({ error, readAtMs, nowMs, onRetry }: { error: string | null; readAtMs: number; nowMs: number; onRetry: () => void }) {
  return (
    <div className="stale-band" role="status">
      <p>
        <strong>Stale.</strong> Showing the read from {utcTime(readAtMs)} ({ago(nowMs - readAtMs)} ago).{' '}
        {error === null ? 'The next read has not come back yet.' : `The latest read failed: ${errorWords(error)}.`} Countdowns are paused until a read succeeds.
      </p>
      <button type="button" className="btn btn-quiet btn-sm" onClick={onRetry}>Retry now</button>
    </div>
  );
}

/** Skeleton rows the size of real rows; no numbers. */
export function Loading({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div className="loading" aria-busy="true">
      <p className="muted">{label}</p>
      <div className="skeleton" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="skeleton-row" />
        ))}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function NotFound({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="state-panel" aria-labelledby="notfound">
      <h1 id="notfound" className="page-title" data-page-title tabIndex={-1}>{title}</h1>
      <div className="state-body">{children}</div>
    </section>
  );
}
