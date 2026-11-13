/** / — the landing page. Copy drawn from the brief and README; styled from docs/design/direction.md (Passbook, unslop craft pass). */
import type { Deployment } from '../../../src/lib/deployments';
import { REPO_URL } from '../deployment';
import { Passbook } from './Passbook';

export function Landing({ deployment }: { deployment: Deployment | null }) {
  return (
    <>
      <header className="nav">
        <div className="wrap nav-row">
          <a className="wordmark" href="./">Fiador</a>
          <nav className="nav-links">
            <a href={REPO_URL}>Source</a> <a className="btn btn-sm" href="./app/">Open the board</a>
          </nav>
        </div>
      </header>
      <main>
        <section aria-labelledby="hero" className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1 id="hero">A credit union seat for Sputnik DAOs</h1>
              <p className="lede">
                Members borrow treasury NEAR at once within their standing, a council grant that grows with every on-time repayment. A co-signer covers more and
                anything larger goes to a council vote. Every payout is a native Sputnik proposal, and every repayment returns to the treasury.
              </p>
              <p className="actions">
                <a className="btn btn-lg" href="./app/">Open the live board</a> <a className="btn btn-quiet btn-lg" href={REPO_URL}>Read the source</a>
              </p>
            </div>
            <Passbook deployment={deployment} />
          </div>
        </section>

        <section aria-labelledby="problem" className="band">
          <div className="wrap">
            <h2 id="problem">A DAO treasury can only give money away</h2>
            <div className="problem-grid">
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
          </div>
        </section>

        <section aria-labelledby="how" className="band">
          <div className="wrap">
            <h2 id="how">One seat in the DAO's policy, three lanes</h2>
            <p className="intro">
              Fiador is one contract, the desk, holding one narrow seat in the DAO's own policy: it may file and approve transfer proposals and nothing else. It never
              holds loan funds. The DAO pays every loan through its own Transfer proposal.
            </p>
            <ol className="lanes">
              <li>
                <h3>Standing lane</h3>
                <p>
                  The amount fits your unused standing and the book cap has room: the desk files a Sputnik transfer and approves it in the same transaction chain. No
                  council vote.
                </p>
              </li>
              <li>
                <h3>Co-signed lane</h3>
                <p>
                  Above your standing, the desk holds your request. One member co-signs the gap from their own standing, and the loan is filed and approved inside
                  their transaction. The pledge stays locked until you repay.
                </p>
              </li>
              <li>
                <h3>Council lane</h3>
                <p>Anything larger is filed as an ordinary proposal that the council votes, 2 of 3. Once approved, the desk tracks it as a loan.</p>
              </li>
            </ol>

            <div className="closes">
              <h3>When a loan closes</h3>
              <dl className="outcomes">
                <div>
                  <dt><span className="stamp ink-repaid">Repaid</span></dt>
                  <dd>On time: your standing grows by up to the step the DAO set, never by more than you put at risk, and your co-signer's grows too.</dd>
                </div>
                <div>
                  <dt><span className="stamp ink-late">Repaid late</span></dt>
                  <dd>After the term but within the grace period: the loan closes with no gain and no slash.</dd>
                </div>
                <div>
                  <dt><span className="stamp ink-default">Defaulted</span></dt>
                  <dd>Past the grace period: your standing goes to zero, and your co-signer loses exactly what they pledged.</dd>
                </div>
                <div>
                  <dt><span className="stamp ink-void">Refused</span></dt>
                  <dd>Sputnik would not file the transfer, so no proposal exists and nothing was paid.</dd>
                </div>
              </dl>
              <p className="council">
                The council admits members, sets every limit and can unseat the desk with an ordinary 2-of-3 proposal, after which Sputnik itself refuses the next
                request.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="proof" className="band">
          <div className="wrap">
            <h2 id="proof">Check it yourself</h2>
            <ul className="checks">
              <li>
                <h3>A proposal id on every funded loan</h3>
                <p>
                  Every funded loan on the board carries its Sputnik proposal id, and each member's standing shows the repaid loans behind what they have earned. A new
                  member starts with the standing the council gave them.
                </p>
              </li>
              <li>
                <h3>
                  <code>npm run verify</code>
                </h3>
                <p>
                  Reads the DAO and the desk through public RPC and checks every loan against its proposal: kind, receiver, amount and status. It needs no wallet and
                  no secrets.
                </p>
              </li>
              <li>
                <h3>A keyless desk</h3>
                <p>After the demo run the desk's access keys were deleted, so it has no admin and cannot be upgraded; verify checks that too.</p>
              </li>
              {deployment === null ? null : (
                <li>
                  <h3>The demo DAO</h3>
                  <p>
                    On NEAR testnet: <code>{deployment.dao}</code>; desk: <code>{deployment.desk}</code>.
                  </p>
                </li>
              )}
            </ul>
          </div>
        </section>

        <section aria-labelledby="try" className="band">
          <div className="wrap">
            <div className="try card">
              <div>
                <h2 id="try">Read the whole book</h2>
                <p>
                  The board reads the treasury, the loan book and every member's standing from testnet every five seconds. Anyone can try a loan too: the desk runs a
                  small visitor line, and <code>npm run visitor</code> borrows and repays from a throwaway faucet account.
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
            Built at NEAR HACKATHON 2026. Testnet only, unaudited. <a href={REPO_URL}>Source on GitHub</a>.
          </p>
        </div>
      </footer>
    </>
  );
}
