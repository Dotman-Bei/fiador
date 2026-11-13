/** / — the landing page. Copy drawn from the brief and README; styled from docs/design/direction.md (Passbook). */
import type { Deployment } from '../../../src/lib/deployments';
import { REPO_URL } from '../deployment';

/** Set by the closing pass once the demo video is published; empty means the slot says so honestly. */
export const DEMO_VIDEO_URL = '';

export function Landing({ deployment }: { deployment: Deployment | null }) {
  return (
    <>
      <header className="masthead">
        <div className="wrap masthead-row">
          <p className="wordmark">Fiador</p>
          <nav className="navlinks">
            <a href="./app/">Open the board</a> <a href={REPO_URL}>Source</a>
          </nav>
        </div>
      </header>
      <main>
        <section aria-labelledby="hero" className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="label kicker">NEAR testnet · Sputnik DAO v2</p>
              <h1 id="hero">
                A credit union seat for <em>Sputnik DAOs</em>
              </h1>
              <p className="lede">
                Members borrow treasury NEAR instantly within a limit earned by on-time repayment, get more when another member co-signs, and anything larger goes to a
                normal council vote. Every loan is a native Sputnik proposal and every repayment returns to the treasury.
              </p>
              <p className="actions">
                <a className="btn" href="./app/">Open the live board</a> <a className="btn btn-line" href={REPO_URL}>Source</a>
              </p>
            </div>
            <aside className="panel lanes-card" aria-label="How a loan is approved">
              <p className="label">How a loan is approved</p>
              <div className="scroll">
                <table className="ledger">
                  <thead>
                    <tr><th>Lane</th><th>When</th><th>Approved by</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Standing</td><td>Fits your unused standing and the book cap</td><td>the desk, at once</td></tr>
                    <tr><td>Co-signed</td><td>Above your standing; a member co-signs the gap</td><td>the desk, in the co-signer's transaction</td></tr>
                    <tr><td>Council</td><td>Anything larger</td><td>the council, 2 of 3</td></tr>
                  </tbody>
                </table>
              </div>
            </aside>
          </div>
        </section>

        <section aria-labelledby="problem" className="band">
          <div className="wrap split">
            <h2 id="problem">The problem</h2>
            <div className="prose">
              <p>
                A community that keeps its money in a Sputnik DAO can only give it away. Every payment out is a one-way payout, so a member who needs a short float, a
                venue deposit to front or a gap before a payout lands, can either ask the whole council to vote a grant or go without.
              </p>
              <p>
                Communities solved this long ago with credit unions: small loans to known members, sized by whether they repaid the last one and backed by a fellow
                member's word. Sputnik DAO and Trezu have none of the pieces that needs: no amount tiers, no automatic approval for trusted members, no limits, and no
                record of who kept their word.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="how" className="band">
          <div className="wrap">
            <div className="split">
              <h2 id="how">How it works</h2>
              <div className="prose">
                <p>
                  Fiador is one contract, the desk, holding one narrow seat in the DAO's own policy: it may file and approve transfer proposals and nothing else. It
                  never holds loan funds. The DAO pays every loan through its own Transfer proposal.
                </p>
              </div>
            </div>
            <ol className="lanes">
              <li>
                <strong>Standing lane.</strong> The amount fits your unused standing and the book cap has room: the desk files a Sputnik transfer and approves it in
                the same transaction chain. No council vote.
              </li>
              <li>
                <strong>Co-signed lane.</strong> Above your standing, the desk holds your request. One member co-signs the gap from their own standing, and the loan
                is filed and approved inside their transaction. The pledge stays locked until you repay.
              </li>
              <li>
                <strong>Council lane.</strong> Anything larger is filed as an ordinary proposal that the council votes, 2 of 3. Once approved, the desk tracks it as a
                loan.
              </li>
            </ol>
            <p className="after-lanes">
              Repay on time and your standing grows by up to the step the DAO set, never by more than you put at risk; your co-signer's grows too. Let a loan run past
              its term and grace period and your standing goes to zero, and your co-signer loses exactly what they pledged. The council admits members, sets every
              limit and can unseat the desk with an ordinary 2-of-3 proposal, after which Sputnik itself refuses the next request.
            </p>
          </div>
        </section>

        <section aria-labelledby="proof" className="band">
          <div className="wrap split">
            <h2 id="proof">Proof you can check</h2>
            <ul className="checks">
              <li>
                Every funded loan on the board carries its Sputnik proposal id, and each member's standing shows the repaid loans behind what they have earned. A new
                member starts with the standing the council gave them.
              </li>
              <li>
                <code>npm run verify</code> reads the DAO and the desk through public RPC and checks every loan against its proposal: kind, receiver, amount and
                status. It needs no wallet and no secrets.
              </li>
              <li>After the demo run the desk's access keys were deleted, so it has no admin and cannot be upgraded; verify checks that too.</li>
              {deployment === null ? null : (
                <li>
                  Demo DAO on NEAR testnet: <code>{deployment.dao}</code>; desk: <code>{deployment.desk}</code>.
                </li>
              )}
            </ul>
          </div>
        </section>

        <section aria-labelledby="demo" className="band">
          <div className="wrap split">
            <h2 id="demo">Demo</h2>
            <div className="video-slot">
              {DEMO_VIDEO_URL === '' ? <p>The demo video is linked here once it is published.</p> : <p><a href={DEMO_VIDEO_URL}>Watch the demo video</a></p>}
            </div>
          </div>
        </section>

        <section aria-labelledby="try" className="cover">
          <div className="wrap cover-row">
            <div>
              <h2 id="try">Try it</h2>
              <p>See the treasury, the loan book and every member's standing, read live from testnet.</p>
            </div>
            <a className="btn btn-paper" href="./app/">Open the board</a>
          </div>
        </section>
      </main>
      <footer>
        <div className="wrap">
          <p>
            Built at NEAR HACKATHON 2026. Testnet only, unaudited. <a href={REPO_URL}>Source on GitHub</a>.
          </p>
        </div>
      </footer>
    </>
  );
}
