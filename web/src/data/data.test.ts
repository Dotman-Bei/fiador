import { describe, expect, it } from 'vitest';
import { runChecks } from '../../../src/lib/verify';
import { DEPLOYMENT, loan, member, NEAR, NOW, POLICY, proposal } from '../test/fixtures';
import { ago, countdown, duration, nsToMs, utcTime } from './format';
import { readSnapshot } from './reads';
import type { Reader } from './reads';
import { createBoardStore, errorWords, INITIAL, nextDelay, phaseOf, STALE_MS } from './store';
import { gatherVerifyInputWeb, loanCheck } from './verify';
import type { ReadStep } from './verify';

/** A fake RPC: answers views from a table, records the calls, and can be told to fail. */
function fakeReader(opts: { fail?: boolean; failProposal?: number; daoMissing?: boolean } = {}): Reader & { calls: string[] } {
  const calls: string[] = [];
  const loans = [loan({ id: 0, proposal_id: 6 }), loan({ id: 1, status: 'Active', proposal_id: 7, closed_at_ms: 0 })];
  const table: Record<string, unknown> = {
    get_config: { dao: DEPLOYMENT.dao, params: { ...{ starter_standing: '1', max_standing: '1', growth_step: '1', book_cap: (12n * NEAR).toString(), loan_term_sec: 120, grace_sec: 60, request_ttl_sec: 600, visitor_slots: 10, visitor_starter: '1', visitor_window_sec: 1800, visitor_deposit: '1', proposal_bond: '0' } }, book: (6n * NEAR).toString(), member_count: 1, loan_count: 2, request_count: 0 },
    get_members: [member({ account_id: 'ada.root.testnet', drawn: (4n * NEAR).toString(), pledged: '0' }), member({ account_id: 'bayo.root.testnet', pledged: (2n * NEAR).toString() })],
    get_loans: loans,
    get_requests: [],
    get_available_amount: (9n * NEAR).toString(),
    get_policy: POLICY,
    get_factory_info: { factory_id: 'sputnikv2.testnet', auto_update: false },
  };
  return {
    calls,
    async view<T>(_account: string, method: string, args?: Record<string, unknown>): Promise<T> {
      calls.push(method + (args && 'id' in args ? `:${String(args['id'])}` : ''));
      if (opts.fail === true) throw new Error('Failed to fetch');
      if (method === 'get_proposal') {
        const id = Number(args?.['id']);
        if (id === opts.failProposal) throw new Error('RPC HTTP 502 for query');
        const l = loans.find((x) => x.proposal_id === id);
        return proposal(id, 'Approved', { kind: { Transfer: { token_id: '', receiver_id: l?.borrower ?? '', amount: l?.principal ?? '0' } } }) as T;
      }
      return table[method] as T;
    },
    async viewAccount() {
      calls.push('view_account');
      if (opts.fail === true) throw new Error('Failed to fetch');
      return opts.daoMissing === true ? null : { amount: (15n * NEAR).toString(), locked: '0', storage_usage: 1, code_hash: 'x' };
    },
    async accessKeyCount() {
      calls.push('access_keys');
      if (opts.fail === true) throw new Error('Failed to fetch');
      return 0;
    },
  };
}

describe('reads', () => {
  it('reads everything once and caches only the proposals of closed loans', async () => {
    const r = fakeReader();
    const cache = new Map();
    const a = await readSnapshot(r, DEPLOYMENT, NOW, cache);
    expect(a.desk.loans).toHaveLength(2);
    expect(a.proposals[6]?.status).toBe('Approved');
    expect(a.daoAccount?.amount).toBe((15n * NEAR).toString());
    expect([...cache.keys()]).toEqual([6]);
    r.calls.length = 0;
    await readSnapshot(r, DEPLOYMENT, NOW + 5_000, cache);
    expect(r.calls.filter((c) => c.startsWith('get_proposal'))).toEqual(['get_proposal:7']);
  });

  it('keeps a missing DAO account as null and a failed proposal as an error, not as data', async () => {
    const s = await readSnapshot(fakeReader({ daoMissing: true, failProposal: 7 }), DEPLOYMENT, NOW);
    expect(s.daoAccount).toBeNull();
    expect(s.proposalErrors).toEqual([7]);
    expect(s.proposals[7]).toBeUndefined();
  });
});

describe('store', () => {
  it('derives the phase: unseeded, loading, live, stale, unavailable', () => {
    expect(phaseOf(false, INITIAL, NOW)).toBe('unseeded');
    expect(phaseOf(true, INITIAL, NOW)).toBe('loading');
    expect(phaseOf(true, { ...INITIAL, error: 'x', lastFailMs: NOW }, NOW)).toBe('unavailable');
    const good = { ...INITIAL, data: {} as never, lastGoodMs: NOW };
    expect(phaseOf(true, good, NOW + 4_000)).toBe('live');
    expect(phaseOf(true, good, NOW + STALE_MS + 1)).toBe('stale');
    expect(phaseOf(true, { ...good, error: 'x', lastFailMs: NOW + 1 }, NOW + 2)).toBe('stale');
  });

  it('keeps the last good snapshot when a later read fails, and never overlaps reads', async () => {
    let fail = false;
    const base = fakeReader();
    const reader: Reader = {
      view: (a, m, args) => (fail ? Promise.reject(new Error('Failed to fetch')) : base.view(a, m, args)),
      viewAccount: (a) => base.viewAccount(a),
      accessKeyCount: (a) => base.accessKeyCount(a),
    };
    let t = NOW;
    const store = createBoardStore(DEPLOYMENT, reader, { clock: () => t });
    const first = store.refresh();
    expect(store.refresh()).toBe(first);
    await first;
    expect(store.getState().data?.readAtMs).toBe(NOW);
    fail = true;
    t = NOW + 5_000;
    await store.refresh();
    const s = store.getState();
    expect(s.data?.readAtMs).toBe(NOW);
    expect(s.error).toBe('Failed to fetch');
    expect(phaseOf(true, s, t)).toBe('stale');
  });

  it('backs off after failed reads, and returns to the normal pace after a good one', () => {
    expect([0, 1, 2, 3, 4, 9].map((f) => nextDelay(5_000, f))).toEqual([5_000, 5_000, 10_000, 20_000, 30_000, 30_000]);
  });

  it('puts RPC failures into words', () => {
    expect(errorWords('TypeError: Failed to fetch')).toBe('the RPC endpoint could not be reached from this browser');
    expect(errorWords('RPC HTTP 429 for query')).toContain('limiting requests');
    expect(errorWords('something else')).toBe('something else');
  });
});

describe('verify in the browser', () => {
  it('gathers the same input as the CLI, reports each read, and runs the same checks', async () => {
    const seen: ReadStep[][] = [];
    const input = await gatherVerifyInputWeb(fakeReader(), DEPLOYMENT, (s) => seen.push(s));
    const last = seen[seen.length - 1] ?? [];
    expect(last.map((s) => s.label)).toEqual(['DAO factory settings', 'DAO policy', 'Desk config, members, loans and requests', 'Desk access keys', 'Sputnik proposal #6', 'Sputnik proposal #7']);
    expect(last.every((s) => s.done)).toBe(true);
    const checks = runChecks(input);
    expect(checks.find((c) => c.name === 'desk is keyless (frozen)')?.ok).toBe(true);
    expect(loanCheck(checks, 0)?.ok).toBe(true);
  });
});

describe('format', () => {
  it('writes ages, times, durations and countdowns', () => {
    expect(ago(4_200)).toBe('4 s');
    expect(ago(125_000)).toBe('2 min');
    expect(utcTime(Date.UTC(2026, 10, 13, 17, 31, 35))).toBe('17:31:35 UTC');
    expect([duration(120), duration(60), duration(600), duration(1800), duration(90)]).toEqual(['2 min', '1 min', '10 min', '30 min', '90 s']);
    expect(nsToMs('1794591089635169696')).toBe(1794591089635);
    expect(countdown(NOW + 125_000, NOW)).toBe('2m 05s');
  });
});
