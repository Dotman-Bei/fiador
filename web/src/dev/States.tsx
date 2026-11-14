/**
 * Dev-only state gallery (`#/__states`): every populated or failing state the frozen testnet desk cannot show live,
 * rendered from fixtures and marked Fixture. Loaded only when import.meta.env.DEV is true, so it never reaches dist/.
 */
import type { ReactNode } from 'react';
import { DEMO_PARAMS } from '../../../src/lib/desk';
import { buildFiadorPolicy } from '../../../src/lib/sputnik';
import { DeskView } from '../board/pages/Desk';
import { LoanDetailView } from '../board/pages/LoanDetail';
import { MemberDetailView } from '../board/pages/Members';
import { LINKS, OverviewView } from '../board/pages/Overview';
import { RequestsView } from '../board/pages/Requests';
import { Loading, NotSeeded, Prov, StaleBand, Unavailable } from '../board/states';
import type { Freshness } from '../board/states';
import { DEPLOYMENT, loan, member, NEAR, NOW, proposal, snapshot } from '../test/fixtures';

const FRESH: Freshness = { phase: 'live', readAtMs: NOW - 3_000, nowMs: NOW };
const GRACE = DEMO_PARAMS.grace_sec * 1000;

const BUSY = snapshot({
  desk: {
    ...snapshot().desk,
    config: { ...snapshot().desk.config, book: (9n * NEAR).toString() },
    members: [member({ account_id: 'ada.root.testnet' }), member({ account_id: 'bayo.root.testnet', standing: (5n * NEAR).toString() })],
    loans: [
      loan({ id: 0, created_at_ms: NOW - 900_000, closed_at_ms: NOW - 800_000 }),
      loan({ id: 1, status: 'Active', lane: 'Standing', cosigner: null, pledge: '0', principal: (3n * NEAR).toString(), created_at_ms: NOW - 200_000, due_at_ms: NOW - GRACE - 20_000, closed_at_ms: 0 }),
      loan({ id: 2, status: 'Active', created_at_ms: NOW - 40_000, due_at_ms: NOW + 80_000, closed_at_ms: 0, proposal_id: 12 }),
      loan({ id: 3, status: 'AwaitingCouncil', lane: 'Council', cosigner: null, pledge: '0', borrower_part: '0', created_at_ms: NOW - 30_000, due_at_ms: 0, closed_at_ms: 0, proposal_id: 13 }),
    ],
    requests: [{ borrower: 'bayo.root.testnet', amount: (6n * NEAR).toString(), gap: (2n * NEAR).toString(), expires_at_ms: NOW + 420_000, expired: false }],
  },
  proposals: {
    10: proposal(10, 'Approved'),
    11: proposal(11, 'Approved'),
    12: proposal(12, 'Approved'),
    13: proposal(13, 'InProgress', { votes: { 'council-1.root.testnet': 'Approve' }, vote_counts: { council: [1, 0, 0] } }),
  },
});

const UNSEATED = snapshot({ policy: buildFiadorPolicy({ council: DEPLOYMENT.council, deskSeat: [] }), deskKeys: 1 });

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="block gallery-panel" aria-label={title}>
      <h2 className="section-title">{title}</h2>
      <Prov kind="fixture">made-up data for this state; never shown on the live board</Prov>
      <div className="gallery-body">{children}</div>
    </section>
  );
}

export default function States() {
  const noop = (): void => undefined;
  return (
    <div data-gallery="fiador-dev-state-gallery">
      <header className="page-head">
        <h1 className="page-title" data-page-title tabIndex={-1}>State gallery (fixtures, dev only)</h1>
        <p className="page-sub">Every state the frozen testnet desk cannot show live. Excluded from production builds.</p>
      </header>
      <Panel title="Overview: needs a hand (unseated desk, overdue, waiting, due, awaiting council)">
        <OverviewView deployment={DEPLOYMENT} snap={{ ...BUSY, policy: UNSEATED.policy }} fresh={FRESH} links={LINKS} />
      </Panel>
      <Panel title="Loan detail: an active loan, and a council loan awaiting votes">
        <LoanDetailView deployment={DEPLOYMENT} snap={BUSY} fresh={FRESH} id={2} checks={{ phase: 'idle' }} onRunChecks={noop} />
        <LoanDetailView deployment={DEPLOYMENT} snap={BUSY} fresh={FRESH} id={3} checks={{ phase: 'idle' }} onRunChecks={noop} />
      </Panel>
      <Panel title="Requests: one waiting for a co-signer">
        <RequestsView deployment={DEPLOYMENT} snap={BUSY} fresh={FRESH} />
      </Panel>
      <Panel title="Member detail: a standing that does not reconcile">
        <MemberDetailView deployment={DEPLOYMENT} snap={snapshot({ desk: { ...snapshot().desk, members: [member({ account_id: 'ada.root.testnet', standing: (7n * NEAR).toString() })] } })} fresh={FRESH} account="ada.root.testnet" />
      </Panel>
      <Panel title="Desk and proof: unseated, keyed, and a failing check">
        <DeskView
          deployment={DEPLOYMENT}
          snap={UNSEATED}
          fresh={FRESH}
          checks={{
            phase: 'done',
            steps: [],
            run: {
              checks: [
                { name: 'desk is keyless (frozen)', ok: false, detail: '1 access key(s) on desk.root.testnet' },
                { name: 'factory auto-upgrade is off', ok: true, detail: 'auto_update=false' },
              ],
              input: { deployment: DEPLOYMENT, factoryInfo: { factory_id: 'sputnikv2.testnet', auto_update: false }, policy: UNSEATED.policy, config: UNSEATED.desk.config, deskKeyCount: 1, members: [], loans: [], proposals: new Map() },
              ranAtMs: NOW,
            },
          }}
          onRunChecks={noop}
        />
      </Panel>
      <Panel title="Data states: stale, unavailable, loading, not seeded">
        <StaleBand error="RPC HTTP 429 for query" readAtMs={NOW - 42_000} nowMs={NOW} onRetry={noop} />
        <Unavailable error="TypeError: Failed to fetch" rpc={DEPLOYMENT.rpc} onRetry={noop} />
        <Loading label="Reading the DAO and the desk from NEAR testnet · 3 s" rows={3} />
        <NotSeeded />
      </Panel>
    </div>
  );
}
