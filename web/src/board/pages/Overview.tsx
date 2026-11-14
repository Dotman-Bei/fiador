/**
 * Overview (`./app/` and `#/`). README step 3 names what it shows with no hash: the treasury, "Waiting for a co-signer",
 * the loan book with each loan's Sputnik proposal id and status, and every member's standing with the repaid loans behind it.
 */
import type { Deployment } from '../../../../src/lib/deployments';
import { accountUrl } from '../../../../src/lib/deployments';
import { DESK_ROLE, roleMembers } from '../../../../src/lib/sputnik';
import type { Snapshot } from '../../data/reads';
import { duration, near } from '../../data/format';
import { Id, NamingNote } from '../bits';
import type { Check } from '../../../../src/lib/verify';
import { attentionItems, lastMovement } from '../attention';
import { bookSegments, loanRows, memberRows, roomToLend, waitingRows } from '../data';
import { LoanList, MemberList, WaitingList } from '../lists';
import { Empty, Prov } from '../states';
import type { Freshness } from '../states';

export interface Links {
  loan: ((id: number) => string) | null;
  member: ((account: string) => string) | null;
}

export const NO_LINKS: Links = { loan: null, member: null };
export const LINKS: Links = { loan: (id) => `#/loans/${id}`, member: (a) => `#/members/${encodeURIComponent(a)}` };

/** Overview shows the whole book while it is short, then the latest rows and a link to Loans. */
export const OVERVIEW_LOANS = 12;

export function AttentionList({ snap, deployment, fresh, checks }: { snap: Snapshot; deployment: Deployment; fresh: Freshness; checks: readonly Check[] | null }) {
  const clock = fresh.phase === 'stale' ? snap.readAtMs : fresh.nowMs;
  const items = attentionItems(snap, deployment, clock, checks);
  const last = lastMovement(snap);
  return (
    <section className="block" aria-labelledby="attention">
      <h2 id="attention" className="section-title">Needs a hand</h2>
      {items.length === 0 ? (
        <Empty>
          Nothing needs a hand. No request is waiting and no loan is open.{last === null ? '' : ` Last movement: ${last}.`}
        </Empty>
      ) : (
        <ul className="slips attention" aria-label="Needs a hand, most urgent first">
          {items.map((a) => (
            <li key={a.key} className={`slip attn-${a.severity}`}>
              <span className="slip-stub">{a.severity === 'critical' ? 'now' : a.severity}</span>
              <div className="slip-body">
                <p>{a.text}</p>
                <p className="slip-meta">
                  <a href={a.href}>{a.action}</a>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Prov kind="live" fresh={fresh} />
    </section>
  );
}

export function PageHead({ deployment }: { deployment: Deployment }) {
  return (
    <header className="page-head">
      <h1 className="page-title" data-page-title tabIndex={-1}>Fiador board</h1>
      <p className="page-sub">
        Live, read-only view of the demo credit union on NEAR testnet. DAO{' '}
        <a href={accountUrl(deployment, deployment.dao)}><Id>{deployment.dao}</Id></a>, desk{' '}
        <a href={accountUrl(deployment, deployment.desk)}><Id>{deployment.desk}</Id></a>.
      </p>
    </header>
  );
}

export function BookSummary({ snap, fresh }: { snap: Snapshot; fresh: Freshness }) {
  const { config } = snap.desk;
  const cap = BigInt(config.params.book_cap);
  const segments = bookSegments(snap.desk.loans);
  const room = roomToLend(config.params.book_cap, config.book, snap.spendable);
  return (
    <section className="card summary-book" aria-labelledby="sum-book">
      <h2 id="sum-book" className="section-title">The book</h2>
      <p className="figure-xl">
        {near(config.book)} <span className="figure-of">out on loan, of a {near(cap)} cap</span>
      </p>
      <div className="bookbar" role="img" aria-label={`${near(config.book)} of the ${near(cap)} book cap is out on loan`}>
        {segments.map((s) => (
          <span key={s.id} className="bookbar-seg" style={{ width: `${cap === 0n ? 0 : Number((s.principal * 10000n) / cap) / 100}%` }} title={`Loan #${s.id}`} />
        ))}
      </div>
      {segments.length === 0 ? <p className="note">Nothing is out on loan right now.</p> : null}
      <dl className="figures-row">
        <div>
          <dt>Treasury balance</dt>
          <dd>{snap.daoAccount === null ? <span className="signal">DAO account not found</span> : near(snap.daoAccount.amount)}</dd>
        </div>
        <div>
          <dt>Treasury spendable</dt>
          <dd>{near(snap.spendable)}</dd>
        </div>
        <div>
          <dt>Room to lend now</dt>
          <dd>{near(room)}</dd>
        </div>
      </dl>
      <Prov kind="live" fresh={fresh} />
      <Prov kind="derived">room to lend now is the smaller of the room under the cap and the treasury's spendable balance; each member's unused standing limits it further</Prov>
    </section>
  );
}

export function DeskCard({ deployment, snap, fresh }: { deployment: Deployment; snap: Snapshot; fresh: Freshness }) {
  const p = snap.desk.config.params;
  const seated = (roleMembers(snap.policy, DESK_ROLE) ?? []).includes(deployment.desk);
  const frozen = snap.deskKeys === 0;
  return (
    <section className="card summary-desk" aria-labelledby="sum-desk">
      <h2 id="sum-desk" className="section-title">Desk</h2>
      <dl className="facts">
        <dt>Seated in the DAO policy</dt>
        <dd className={seated ? 'tone-yes' : 'signal'}>{seated ? 'yes' : 'no (unseated by the council)'}</dd>
        <dt>Keyless (frozen)</dt>
        <dd className={frozen ? 'tone-yes' : 'signal'}>{frozen ? 'yes: no access keys, so no admin and no upgrade' : `no: ${snap.deskKeys} access key(s)`}</dd>
        <dt>Starter standing (the council's grant)</dt>
        <dd>{near(p.starter_standing)}</dd>
        <dt>Maximum standing</dt>
        <dd>{near(p.max_standing)}</dd>
        <dt>Growth per on-time repayment</dt>
        <dd>up to {near(p.growth_step)}</dd>
        <dt>Loan term / grace</dt>
        <dd>{duration(p.loan_term_sec)} / {duration(p.grace_sec)}</dd>
      </dl>
      <Prov kind="live" fresh={fresh} />
    </section>
  );
}

export function OverviewView({ deployment, snap, fresh, links, checks = null }: { deployment: Deployment; snap: Snapshot; fresh: Freshness; links: Links; checks?: readonly Check[] | null }) {
  // While stale, countdowns stay where the last good read left them.
  const clock = fresh.phase === 'stale' ? snap.readAtMs : fresh.nowMs;
  const waiting = waitingRows(snap.desk.requests, clock);
  const allLoans = loanRows(snap.desk.loans, snap.proposals, clock);
  const loans = links.loan === null ? allLoans : allLoans.slice(0, OVERVIEW_LOANS);
  const members = memberRows(snap.desk.members, snap.desk.loans);
  const root = deployment.root;
  return (
    <>
      <div className="summary-grid">
        <BookSummary snap={snap} fresh={fresh} />
        <DeskCard deployment={deployment} snap={snap} fresh={fresh} />
      </div>

      {links.loan === null ? null : <AttentionList snap={snap} deployment={deployment} fresh={fresh} checks={checks} />}

      <section className="block" aria-labelledby="waiting">
        <h2 id="waiting" className="section-title">Waiting for a co-signer</h2>
        {waiting.length === 0 ? (
          <Empty>No request is waiting for a co-signer.</Empty>
        ) : (
          <WaitingList rows={waiting} root={root} caption="Requests waiting for a co-signer" memberHref={links.member} />
        )}
      </section>

      <section className="block block-ledger" aria-labelledby="book">
        <h2 id="book" className="section-title">Loan book</h2>
        {loans.length === 0 ? (
          <Empty>No loans yet.</Empty>
        ) : (
          <LoanList rows={loans} root={root} caption="Every loan on the desk, newest first" loanHref={links.loan} memberHref={links.member} />
        )}
        {loans.length < allLoans.length ? (
          <p className="note">
            The latest {loans.length} of {allLoans.length} loans. <a href="#/loans">All loans</a>
          </p>
        ) : null}
        <Prov kind="live" fresh={fresh}>each loan's Sputnik proposal id and status, read from the DAO</Prov>
      </section>

      <section className="block" aria-labelledby="members">
        <h2 id="members" className="section-title">Members</h2>
        {members.length === 0 ? (
          <Empty>No members yet.</Empty>
        ) : (
          <MemberList rows={members} root={root} caption="Every member's standing and the repaid loans behind it" memberHref={links.member} loanHref={links.loan} />
        )}
        <NamingNote root={root} />
        <Prov kind="live" fresh={fresh} />
      </section>
    </>
  );
}
