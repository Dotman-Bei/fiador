/** React bindings for the board store: one store for the whole page, a clock for read ages and countdowns. */
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import { INITIAL, phaseOf } from './store';
import type { BoardState, BoardStore, Phase } from './store';

const Ctx = createContext<BoardStore | null>(null);

export function BoardProvider({ store, children }: { store: BoardStore; children: ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export interface BoardView {
  deployment: Deployment | null;
  state: BoardState;
  phase: Phase;
  refresh: () => void;
}

const noop = (): (() => void) => () => undefined;

export function useBoard(nowMs: number): BoardView {
  const store = useContext(Ctx);
  const state = useSyncExternalStore(store?.subscribe ?? noop, store?.getState ?? (() => INITIAL), store?.getState ?? (() => INITIAL));
  const deployment = store?.deployment ?? null;
  return {
    deployment,
    state,
    phase: phaseOf(deployment !== null, state, nowMs),
    refresh: () => void store?.refresh(),
  };
}

/** The current time, re-read every `everyMs` (read ages and countdowns tick in text, nothing animates). */
export function useNow(everyMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
