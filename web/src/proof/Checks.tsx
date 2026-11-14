/**
 * The desk's checks, run in the browser: the same reads as `npm run verify` and the same pure checks (src/lib/verify.ts).
 * Shared by the landing's proof section and the board's Desk and proof page.
 */
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import { RpcClient } from '../../../src/lib/rpc';
import type { Check } from '../../../src/lib/verify';
import { errorWords } from '../data/store';
import { utcTime } from '../data/format';
import { runVerifyWeb } from '../data/verify';
import type { ReadStep, VerifyRun } from '../data/verify';
import { Prov } from '../board/states';

export type ChecksState =
  | { phase: 'idle' }
  | { phase: 'running'; steps: ReadStep[] }
  | { phase: 'done'; steps: ReadStep[]; run: VerifyRun }
  | { phase: 'failed'; steps: ReadStep[]; error: string };

export function summaryOf(checks: readonly Check[]): string {
  const failed = checks.filter((c) => !c.ok).length;
  return failed === 0 ? `${checks.length} of ${checks.length} checks passed` : `${failed} of ${checks.length} checks failed`;
}

export function ChecksView({ state, onRun, nowMs }: { state: ChecksState; onRun: () => void; nowMs: number }) {
  if (state.phase === 'idle') {
    return (
      <div className="checks">
        <p className="checks-lede">
          Reads the DAO and the desk through public RPC and checks every loan against its Sputnik proposal: kind, receiver, amount and status. Same code as{' '}
          <code>npm run verify</code>; it needs no wallet and no secrets.
        </p>
        <p>
          <button type="button" className="btn" onClick={onRun}>Run the checks</button>
        </p>
      </div>
    );
  }
  const steps = (
    <ol className="read-steps" aria-label="Reads">
      {state.steps.map((s) => (
        <li key={s.key} className={s.done ? 'read-done' : 'read-wait'}>
          <span className="read-mark" aria-hidden="true" />
          {s.label}
          <span className="read-word">{s.done ? 'read' : 'reading'}</span>
        </li>
      ))}
    </ol>
  );
  if (state.phase === 'running') {
    const done = state.steps.filter((s) => s.done).length;
    return (
      <div className="checks" aria-busy="true">
        <p className="checks-summary" role="status">Reading from NEAR testnet: {done} of {state.steps.length} reads back</p>
        {steps}
      </div>
    );
  }
  if (state.phase === 'failed') {
    return (
      <div className="checks checks-down" role="alert">
        <p className="checks-summary signal">The checks could not run: {errorWords(state.error)}.</p>
        {steps}
        <p>
          <button type="button" className="btn btn-quiet" onClick={onRun}>Retry</button>
        </p>
        <Prov kind="rules">without a browser, <code>npm run verify</code> runs the same checks from the command line</Prov>
      </div>
    );
  }
  const { checks, ranAtMs } = state.run;
  const ok = checks.every((c) => c.ok);
  return (
    <div className="checks">
      <p className={`checks-summary ${ok ? 'checks-ok' : 'signal'}`} role="status">
        {summaryOf(checks)} at {utcTime(ranAtMs)}
      </p>
      <ul className="check-list">
        {checks.map((c) => (
          <li key={c.name} className={c.ok ? 'check check-pass' : 'check check-fail'}>
            <span className="check-mark">{c.ok ? 'PASS' : 'FAIL'}</span>
            <span className="check-name">{c.name}</span>
            <span className="check-detail id">{c.detail}</span>
          </li>
        ))}
      </ul>
      <div className="checks-foot">
        <Prov kind="live" fresh={{ phase: 'live', readAtMs: ranAtMs, nowMs }}>
          same code as <code>npm run verify</code> (src/lib/verify.ts)
        </Prov>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onRun}>Run again</button>
      </div>
    </div>
  );
}

/** One run of the checks per page visit, shared by every view that shows them. */
export interface ChecksStore {
  getState(): ChecksState;
  subscribe(l: () => void): () => void;
  run(): void;
}

export function createChecksStore(deployment: Deployment | null): ChecksStore {
  let state: ChecksState = { phase: 'idle' };
  const listeners = new Set<() => void>();
  const set = (s: ChecksState): void => {
    state = s;
    for (const l of listeners) l();
  };
  let busy = false;
  return {
    getState: () => state,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    run() {
      if (deployment === null || busy) return;
      busy = true;
      let steps: ReadStep[] = [];
      set({ phase: 'running', steps });
      runVerifyWeb(new RpcClient(deployment.rpc), deployment, Date.now, (st) => {
        steps = st;
        set({ phase: 'running', steps: st });
      })
        .then((r) => set({ phase: 'done', steps, run: r }))
        .catch((e: unknown) => set({ phase: 'failed', steps, error: e instanceof Error ? e.message : String(e) }))
        .finally(() => {
          busy = false;
        });
    },
  };
}

const IDLE: ChecksState = { phase: 'idle' };
const ChecksCtx = createContext<ChecksStore | null>(null);

export function ChecksProvider({ store, children }: { store: ChecksStore; children: ReactNode }) {
  return <ChecksCtx.Provider value={store}>{children}</ChecksCtx.Provider>;
}

export function useChecksStore(store?: ChecksStore | null): { state: ChecksState; run: () => void } {
  const ctx = useContext(ChecksCtx);
  const s = store ?? ctx;
  const state = useSyncExternalStore(s?.subscribe ?? (() => () => undefined), s?.getState ?? (() => IDLE), () => IDLE);
  return { state, run: () => s?.run() };
}

/** For a page that owns its own run (the landing): a store made once for the page. */
export function useChecks(deployment: Deployment | null, auto: boolean): { state: ChecksState; run: () => void } {
  const [store] = useState(() => createChecksStore(deployment));
  const result = useChecksStore(store);
  useEffect(() => {
    if (auto) store.run();
  }, [auto, store]);
  return result;
}
