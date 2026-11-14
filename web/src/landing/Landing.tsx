/**
 * / — the landing page. Copy drawn from the brief and README; styled from docs/design/direction.md (Counter slip).
 * The hero is the product: the live chain instrument over the real desk.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Lane } from '../../../src/lib/desk';
import type { Deployment } from '../../../src/lib/deployments';
import { RpcClient } from '../../../src/lib/rpc';
import { REPO_URL } from '../deployment';
import { INITIAL, phaseOf, createBoardStore } from '../data/store';
import { useNow } from '../data/react';
import { Stamp } from '../board/bits';
import { ChecksView, useChecks } from '../proof/Checks';
import { latestWithStatus } from './chain';
import { DEFAULT_SELECTION, InstrumentView } from './Instrument';
import type { Selection } from './Instrument';

/** The landing reads the desk once and then every 30 seconds while open (the board reads every 5). */
const LANDING_POLL_MS = 30_000;

const OUTCOMES: readonly { status: string; text: string }[] = [
  { status: 'Repaid', text: "On time: your standing grows by up to the step the DAO set, never by more than you put at risk, and your co-signer's grows too." },
  { status: 'RepaidLate', text: 'After the term but within the grace period: the loan closes with no gain and no slash.' },
  { status: 'Defaulted', text: 'Past the grace period: your standing goes to zero, and your co-signer loses exactly what they pledged.' },
  { status: 'Refused', text: 'Sputnik would not file the transfer, so no proposal exists and nothing was paid.' },
];

const LANE_TEXT: readonly { lane: Lane; title: string; text: string }[] = [
  {
    lane: 'Standing',
    title: 'Standing lane',
    text: 'The amount fits your unused standing and the book cap has room: the desk files a Sputnik transfer and approves it in the same transaction chain. No council vote.',
  },
  {
    lane: 'Cosigned',
    title: 'Co-signed lane',
    text: 'Above your standing, the desk holds your request. One member co-signs the gap from their own standing, and the loan is filed and approved inside their transaction. The pledge stays locked until you repay.',
  },
  { lane: 'Council', title: 'Council lane', text: 'Anything larger is filed as an ordinary proposal that the council votes, 2 of 3. Once approved, the desk tracks it as a loan.' },
];

export function Landing({ deployment }: { deployment: Deployment | null }) {
  const [store] = useState(() => createBoardStore(deployment, deployment === null ? null : new RpcClient(deployment.rpc), { pollMs: LANDING_POLL_MS }));
  const [bootMs] = useState(() => Date.now());
  useEffect(() => {
    store.start();
    return () => store.stop();
  }, [store]);
  const state = useSyncExternalStore(store.subscribe, store.getState, () => INITIAL);
  const nowMs = useNow();
  const [sel, setSel] = useState<Selection>(DEFAULT_SELECTION);
  const checks = useChecks(deployment, false);
  const fresh = { phase: phaseOf(deployment !== null, state, nowMs), readAtMs: state.lastGoodMs, nowMs };
  const loans = state.data?.desk.loans ?? [];

  const follow = (s: Selection): void => {
    setSel(s);
    const el = document.getElementById('instrument');
    el?.scrollIntoView({ block: 'start' });
    el?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
  };

  return (
    <>
      <header className="nav">
        <div className="wrap nav-row">
          <a className="wordmark" href="./">Fiador</a>
          <nav className="nav-links" aria-label="Site">
            <a href={REPO_URL}>Source</a> <a className="btn btn-sm" href="./app/">Open the board</a>
          </nav>
        </div>
      </header>
      <main>
        <section aria-labelledby="hero" className="hero">
          <div className="wrap">
            <div className="hero-copy">
              <h1 id="hero">A credit union seat for Sputnik DAOs</h1>
              <p className="lede">
                Members borrow treasury NEAR at once within their standing, a council grant that grows with every on-time repayment. A co-signer covers more and
                anything larger goes to a council vote. Every payout is a native Sputnik proposal, and every repayment returns to the treasury.
              </p>
            </div>
            <div id="instrument" className="hero-instrument">
              <InstrumentView
                deployment={deployment}
                snap={state.data}
                fresh={fresh}
                error={state.error}
                elapsedMs={nowMs - bootMs}
                sel={sel}
                onSelect={setSel}
                onRetry={() => void store.refresh()}
              />
            </div>
            <p className="actions">
              <a className="btn btn-lg" href="./app/">Open the board</a> <a className="btn btn-quiet btn-lg" href={REPO_URL}>Read the source</a>
            </p>
          </div>
        </section>

        <section aria-labelledby="problem" className="band">
          <div className="wrap problem-grid">
            <div>
              <h2 id="problem">A DAO treasury can only give money away</h2>
              <div className="prose">
                <p>
                  Every payment out of a Sputnik DAO is a one-way payout, so a member who needs a short float, a venue deposit to front or a gap before a payout
                  lands, can either ask the whole council to vote a grant or go without.
                </p>
                <p>
                  Communities solved this long ago with credit unions: small loans to known members, sized by whether they repaid the last one and backed by a
                  fellow member's word. Sputnik DAO and Trezu have none of the pieces that needs.
                </p>
              </div>
            </div>
            <div>
              <p className="missing-label">What Sputnik DAO and Trezu lack</p>
              <ul className="missing">
                <li>No amount tiers</li>
                <li>No automatic approval for trusted members</li>
                <li>No limits</li>
                <li>No record of who kept their word</li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="how" className="band">
          <div className="wrap">
            <h2 id="how">Three lanes, and how a loan closes</h2>
            <p className="intro">
              Fiador is one contract, the desk, holding one narrow seat in the DAO's own policy: it may file and approve transfer proposals and nothing else. It never
              holds loan funds. The DAO pays every loan through its own Transfer proposal.
            </p>
            <ol className="lanes">
              {LANE_TEXT.map((l) => (
                <li key={l.lane}>
                  <h3>{l.title}</h3>
                  <p>{l.text}</p>
                  {deployment === null ? null : (
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => follow({ ...sel, lane: l.lane, loanId: null })}>
                      Follow a real one above
                    </button>
                  )}
                </li>
              ))}
            </ol>

            <div className="closes">
              <h3>When a loan closes</h3>
              <dl className="outcomes">
                {OUTCOMES.map((o) => {
                  const real = latestWithStatus(loans, o.status);
                  return (
                    <div key={o.status}>
                      <dt>
                        <Stamp status={o.status} />
                      </dt>
                      <dd>
                        <p>{o.text}</p>
                        {real === null ? null : (
                          <button type="button" className="link-btn" onClick={() => follow({ ...sel, lane: real.lane, loanId: real.id })}>
                            Follow loan #{real.id}, which ended this way
                          </button>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="council">
                The council admits members, sets every limit and can unseat the desk with an ordinary 2-of-3 proposal, after which Sputnik itself refuses the next
                request.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="proof" className="band">
          <div className="wrap proof-grid">
            <div>
              <h2 id="proof">Run the desk's checks here</h2>
              <p className="intro">
                Every funded loan on the board carries its Sputnik proposal id. The checks read the DAO and the desk from public RPC, in your browser, and compare every
                loan with its proposal. After the demo run the desk's access keys were deleted, so it has no admin and cannot be upgraded; the checks confirm that too.
              </p>
              {deployment === null ? null : (
                <p className="ids">
                  On NEAR testnet: DAO <code>{deployment.dao}</code>; desk <code>{deployment.desk}</code>.
                </p>
              )}
            </div>
            <div className="proof-panel">
              {deployment === null ? (
                <p>The demo DAO has not been seeded in this build. <code>npm run verify</code> runs the checks once it is.</p>
              ) : (
                <ChecksView state={checks.state} onRun={checks.run} nowMs={nowMs} />
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="try" className="band">
          <div className="wrap">
            <div className="try card">
              <div>
                <h2 id="try">Open the board</h2>
                <p>
                  The board reads the treasury, the loan book and every member's standing from testnet every five seconds, with a page for every loan and every member.
                  Anyone can try a loan too: the desk runs a small visitor line, and <code>npm run visitor</code> borrows and repays from a throwaway faucet account. A
                  wallet is optional.
                </p>
              </div>
              <a className="btn btn-lg" href="./app/">Open the board</a>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div className="wrap">
          <p>
            Built at NEAR HACKATHON 2026. Testnet only, unaudited, not real money. <a href={REPO_URL}>Source on GitHub</a>.
          </p>
        </div>
      </footer>
    </>
  );
}
