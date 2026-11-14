/**
 * The board's overview. Rewritten for the redesign (S1): the single-scroll BoardView was replaced by the routed shell,
 * so the same facts the old test asserted (the five blocks, the proposal id and status, the explorer link, the keyless
 * sentence, the empty and unseeded copy) are asserted on the Overview route's view instead.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEPLOYMENT, loan, NEAR, NOW, snapshot } from '../test/fixtures';
import { NO_LINKS, OverviewView } from './pages/Overview';
import { NotSeeded, StaleBand, Unavailable } from './states';
import type { Freshness } from './states';

const LIVE: Freshness = { phase: 'live', readAtMs: NOW - 4_000, nowMs: NOW };

describe('board overview', () => {
  it('shows what README step 3 names: treasury, the waiting list, the loan book with proposal ids, members', () => {
    const html = renderToStaticMarkup(<OverviewView deployment={DEPLOYMENT} snap={snapshot()} fresh={LIVE} links={NO_LINKS} />);
    for (const heading of ['The book', 'Desk', 'Waiting for a co-signer', 'Loan book', 'Members']) expect(html).toContain(`>${heading}</h2>`);
    expect(html).toContain('Treasury balance');
    expect(html).toContain('12 NEAR');
    expect(html).toContain('#10 Approved');
    expect(html).toContain('Repaid loans behind the standing');
    expect(html).toContain('yes: no access keys, so no admin and no upgrade');
  });

  it('labels every group with its provenance and the age of the read', () => {
    const html = renderToStaticMarkup(<OverviewView deployment={DEPLOYMENT} snap={snapshot()} fresh={LIVE} links={NO_LINKS} />);
    expect(html).toContain('read from NEAR testnet 4 s ago');
    expect(html).toContain('Derived');
  });

  it('says so when nothing is waiting or there are no loans', () => {
    const empty = snapshot({ desk: { ...snapshot().desk, loans: [], requests: [] } });
    const html = renderToStaticMarkup(<OverviewView deployment={DEPLOYMENT} snap={empty} fresh={LIVE} links={NO_LINKS} />);
    expect(html).toContain('No request is waiting for a co-signer.');
    expect(html).toContain('No loans yet.');
    expect(html).toContain('Nothing is out on loan right now.');
  });

  it('never shows a missing DAO account or a missing proposal as zero or as dots', () => {
    const html = renderToStaticMarkup(
      <OverviewView deployment={DEPLOYMENT} snap={snapshot({ daoAccount: null, proposals: {}, proposalErrors: [10] })} fresh={LIVE} links={NO_LINKS} />,
    );
    expect(html).toContain('DAO account not found');
    expect(html).toContain('#10 status unavailable');
    expect(html).not.toContain('…');
  });

  it('pauses countdowns at the last good read while stale', () => {
    const active = snapshot({ desk: { ...snapshot().desk, loans: [loan({ id: 0, status: 'Active', due_at_ms: NOW + 60_000, closed_at_ms: 0 })], config: snapshot().desk.config } });
    const stale: Freshness = { phase: 'stale', readAtMs: NOW, nowMs: NOW + 45_000 };
    const html = renderToStaticMarkup(<OverviewView deployment={DEPLOYMENT} snap={active} fresh={stale} links={NO_LINKS} />);
    expect(html).toContain('1m 00s left');
    expect(html).toContain('Stale');
  });

  it('explains the states: unseeded, unavailable, stale', () => {
    expect(renderToStaticMarkup(<NotSeeded />)).toContain('has not been seeded in this build');
    const down = renderToStaticMarkup(<Unavailable error="Failed to fetch" rpc={DEPLOYMENT.rpc} onRetry={() => undefined} />);
    expect(down).toContain('the RPC endpoint could not be reached from this browser');
    expect(down).toContain('Retry now');
    const band = renderToStaticMarkup(<StaleBand error="RPC HTTP 429 for query" readAtMs={NOW} nowMs={NOW + 42_000} onRetry={() => undefined} />);
    expect(band).toContain('42 s ago');
    expect(band).toContain('HTTP 429');
  });

  it('keeps amounts in NEAR with the shared format', () => {
    const html = renderToStaticMarkup(<OverviewView deployment={DEPLOYMENT} snap={snapshot({ spendable: (15n * NEAR + NEAR / 2n).toString() })} fresh={LIVE} links={NO_LINKS} />);
    expect(html).toContain('15.5 NEAR');
  });
});
