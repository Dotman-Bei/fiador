/**
 * The board's one live resource: read, then wait, then read again. A read starts only after the previous one
 * settles (no overlap, no out-of-order result), pauses while the tab is hidden, and keeps the last good snapshot
 * when a later read fails so the page can say it is stale instead of passing it off as live.
 */
import type { Deployment } from '../../../src/lib/deployments';
import type { ProposalOutput } from '../../../src/lib/sputnik';
import { readSnapshot } from './reads';
import type { Reader, Snapshot } from './reads';

export const POLL_MS = 5_000;
/** A snapshot older than this is stale even if no read has failed (a read may be hanging). */
export const STALE_MS = 20_000;

export type Phase = 'unseeded' | 'loading' | 'live' | 'stale' | 'unavailable';

export interface BoardState {
  data: Snapshot | null;
  error: string | null;
  lastGoodMs: number | null;
  lastFailMs: number | null;
  reading: boolean;
}

export const INITIAL: BoardState = { data: null, error: null, lastGoodMs: null, lastFailMs: null, reading: false };

export function phaseOf(deployed: boolean, s: BoardState, nowMs: number): Phase {
  if (!deployed) return 'unseeded';
  if (s.data === null) return s.error === null ? 'loading' : 'unavailable';
  const failedSinceGood = s.lastFailMs !== null && s.lastGoodMs !== null && s.lastFailMs > s.lastGoodMs;
  if (failedSinceGood || nowMs - (s.lastGoodMs ?? 0) > STALE_MS) return 'stale';
  return 'live';
}

/** An RPC failure in words; the raw message stays available beside it. */
export function errorWords(raw: string): string {
  if (/failed to fetch|networkerror|load failed/i.test(raw)) return 'the RPC endpoint could not be reached from this browser';
  const http = /RPC HTTP (\d{3})/.exec(raw);
  if (http?.[1] === '429') return 'the RPC endpoint is limiting requests (HTTP 429)';
  if (http !== null) return `the RPC endpoint answered HTTP ${http[1] ?? ''}`;
  if (/UNKNOWN_ACCOUNT|does not exist/i.test(raw)) return 'an account the board reads does not exist on this network';
  return raw;
}

export interface BoardStore {
  readonly deployment: Deployment | null;
  getState(): BoardState;
  subscribe(listener: () => void): () => void;
  start(): void;
  stop(): void;
  /** Read now (Retry). Ignored while a read is in flight. */
  refresh(): Promise<void>;
}

export function createBoardStore(
  deployment: Deployment | null,
  reader: Reader | null,
  opts: { clock?: () => number; pollMs?: number } = {},
): BoardStore {
  const clock = opts.clock ?? Date.now;
  const pollMs = opts.pollMs ?? POLL_MS;
  const cache = new Map<number, ProposalOutput>();
  const listeners = new Set<() => void>();
  let state: BoardState = INITIAL;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let inflight: Promise<void> | null = null;
  const hasDocument = typeof document !== 'undefined';

  const set = (patch: Partial<BoardState>): void => {
    state = { ...state, ...patch };
    for (const l of listeners) l();
  };

  const schedule = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!running || (hasDocument && document.hidden)) return;
    timer = setTimeout(() => void refresh(), pollMs);
  };

  const refresh = (): Promise<void> => {
    if (deployment === null || reader === null) return Promise.resolve();
    if (inflight !== null) return inflight;
    set({ reading: true });
    inflight = readSnapshot(reader, deployment, clock(), cache)
      .then((data) => set({ data, error: null, lastGoodMs: data.readAtMs, reading: false }))
      .catch((e: unknown) => set({ error: e instanceof Error ? e.message : String(e), lastFailMs: clock(), reading: false }))
      .finally(() => {
        inflight = null;
        schedule();
      });
    return inflight;
  };

  const onVisibility = (): void => {
    if (!running) return;
    if (document.hidden) {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    } else {
      void refresh();
    }
  };

  return {
    deployment,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (running) return;
      running = true;
      if (hasDocument) document.addEventListener('visibilitychange', onVisibility);
      void refresh();
    },
    stop() {
      running = false;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (hasDocument) document.removeEventListener('visibilitychange', onVisibility);
    },
    refresh,
  };
}
