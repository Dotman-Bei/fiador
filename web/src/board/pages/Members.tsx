/** Members (`#/members`) and Member detail (`#/members/:account`): the member's passbook and how their standing got here. */
import type { LoanView } from '../../../../src/lib/desk';
import type { Deployment } from '../../../../src/lib/deployments';
import { accountUrl } from '../../../../src/lib/deployments';
import type { Snapshot } from '../../data/reads';
import { countdown, duration, near, utcDateTime, utcTime } from '../../data/format';
import { entryDetail, proposalWords, shortAccount } from '../../ledger';
import { Id, NamingNote, Stamp } from '../bits';
import { memberRows } from '../data';
import { MemberList } from '../lists';
import { hrefOf, loanHref, memberHref } from '../router';
import { standingTrail } from '../standing';
import { Empty, NotFound, Prov } from '../states';
import type { Freshness } from '../states';
import { LINKS } from './Overview';

/** Visitors take at most this many loans per seat (VISITOR_MAX_LOANS, contract/desk/src/lending.rs). */
const VISITOR_LOAN_LIMIT = 3;

export function MembersView({ deployment, snap, fresh }: { deployment: Deployment; snap: Snapshot; fresh: Freshness }) {
  const rows = memberRows(snap.desk.members, snap.desk.loans);
  return (
    <>
      <header className="page-head">
        <h1 className="page-title" data-page-title tabIndex={-1}>Members</h1>
        <p className="page-sub">Every member's standing, what they have drawn and pledged, and the repaid loans behind it. Standing starts as a council grant.</p>
      </header>
      {rows.length === 0 ? (
        <Empty>No members yet.</Empty>
      ) : (
        <MemberList rows={rows} root={deployment.root} caption="Every member's standing and the repaid loans behind it" memberHref={LINKS.member} loanHref={LINKS.loan} />
      )}
      <NamingNote root={deployment.root} />
      <Prov kind="live" fresh={fresh} />
    </>
  );
}

/** The member's passbook: one ruled line per loan they borrowed or co-signed, stamped with how it ended. Only real lines. */
export function MemberPassbook({ account, loans, root }: { account: string; loans: readonly LoanView[]; root: string }) {
  const mine = loans.filter((l) => l.borrower === account || l.cosigner === account).sort((a, b) => a.id - b.id);
  if (mine.length === 0) return <Empty>No loans yet as borrower or co-signer.</Empty>;
  return (
    <div className="passbook-page">
      <table className="table pb-table">
        <caption className="vh">Loans this member borrowed or co-signed, oldest first</caption>
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">Entry</th>
            <th scope="col" className="n">Amount</th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {mine.map((l) => {
            const asBorrower = l.borrower === account;
            return (
              <tr key={l.id}>
                <th scope="row" className="cell-id"><a href={loanHref(l.id)}>#{l.id}</a></th>
                <td>
                  <span className="pb-who">{asBorrower ? 'borrowed' : `co-signed for ${shortAccount(l.borrower, root)}`}</span>
                  <span className="pb-how">{asBorrower ? entryDetail(l, root) : `pledged ${near(l.pledge)}`} · {proposalWords(l)}</span>
                </td>
                <td className="n">{near(l.principal)}</td>
                <td><Stamp status={l.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MemberDetailView({ deployment, snap, fresh, account }: { deployment: Deployment; snap: Snapshot; fresh: Freshness; account: string }) {
  const root = deployment.root;
  const m = snap.desk.members.find((x) => x.account_id === account);
  if (m === undefined) {
    return (
      <NotFound title="This account is not a member of the desk">
        <p>
          <Id>{account}</Id> is not among the desk's {snap.desk.members.length} members.
        </p>
        <ul className="link-list">
          {snap.desk.members.map((x) => (
            <li key={x.account_id}><a href={memberHref(x.account_id)}>{shortAccount(x.account_id, root)}</a></li>
          ))}
        </ul>
      </NotFound>
    );
  }
  const params = snap.desk.config.params;
  const trail = standingTrail(m, snap.desk.loans, params);
  const request = snap.desk.requests.find((r) => r.borrower === account && !r.expired && r.expires_at_ms > fresh.nowMs);
  const clock = fresh.phase === 'stale' ? snap.readAtMs : fresh.nowMs;
  const name = shortAccount(account, root);
  return (
    <>
      <header className="page-head detail-head">
        <p className="crumbs">
          <a href="#/members">Members</a> <span aria-hidden="true">/</span> {name}
        </p>
        <h1 className="page-title" data-page-title tabIndex={-1}>{name}</h1>
        <p className="page-sub">
          {m.visitor === null ? 'Member' : 'Visitor'} · <a href={accountUrl(deployment, account)}><Id>{account}</Id></a>
        </p>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section aria-labelledby="pb-h">
            <h2 id="pb-h" className="section-title">Passbook</h2>
            <MemberPassbook account={account} loans={snap.desk.loans} root={root} />
            <p className="note">
              <a href={hrefOf({ name: 'loans', filters: { member: account } })}>Open these loans in the loan list</a>
            </p>
          </section>

          <section className="block" aria-labelledby="trail-h">
            <h2 id="trail-h" className="section-title">How the standing got here</h2>
            <ol className="trail">
              {trail.steps.map((s, i) => (
                <li key={i}>
                  <span className="trail-what">
                    {s.loanId === null ? 'Start' : <a href={loanHref(s.loanId)}>Loan #{s.loanId}</a>}
                    {' · '}
                    {s.text}
                    {s.atMs === null ? null : <span className="cell-quiet"> · {utcTime(s.atMs)}</span>}
                  </span>
                  <span className="trail-delta">{s.delta === null ? '' : s.delta === 0n ? '±0' : s.delta > 0n ? `+${near(s.delta)}` : `−${near(-s.delta)}`}</span>
                  <span className="trail-after">{near(s.after)}</span>
                </li>
              ))}
            </ol>
            <p className={trail.reconciles ? 'trail-result' : 'trail-result signal'}>
              {trail.reconciles
                ? `Reconciles with the desk's figure: ${near(trail.read)}.`
                : `Differs from the desk's figure (${near(trail.read)}) by ${near(trail.read > trail.derived ? trail.read - trail.derived : trail.derived - trail.read)}: a parameter or a council action changed it, and the desk keeps no history.`}
            </p>
            <Prov kind="derived">
              from the loan book and the desk's rule (on time the borrower gains up to {near(params.growth_step)} and the co-signer up to the same, capped at {near(params.max_standing)}; a default sets the borrower to 0 and takes the pledge); the desk stores only the current figure
            </Prov>
          </section>
        </div>

        <aside className="detail-side">
          <div className="card side-card">
            <h2 className="section-title">Standing</h2>
            <p className="figure-xl">{near(m.standing)}</p>
            <dl className="facts facts-stack">
              <dt>Unused</dt>
              <dd>{near(m.unused)}</dd>
              <dt>Drawn</dt>
              <dd>{near(m.drawn)}</dd>
              <dt>Pledged for others</dt>
              <dd>{near(m.pledged)}</dd>
              <dt>Open loans</dt>
              <dd>{m.open_loans}</dd>
              <dt>Repaid on time</dt>
              <dd>{m.repaid_on_time}</dd>
              <dt>Defaults</dt>
              <dd>{m.defaults}</dd>
            </dl>
            <Prov kind="live" fresh={fresh} />
          </div>

          {m.visitor === null ? null : (
            <div className="card side-card">
              <h2 className="section-title">Visitor seat</h2>
              <dl className="facts facts-stack">
                <dt>Joined</dt>
                <dd>{utcDateTime(m.visitor.joined_at_ms)}</dd>
                <dt>Seat can be recycled after</dt>
                <dd>{utcDateTime(m.visitor.expires_at_ms)}</dd>
                <dt>Deposit (refunded on recycling)</dt>
                <dd>{near(m.visitor.deposit)}</dd>
                <dt>Loans taken</dt>
                <dd>{m.visitor.loans_taken} of {VISITOR_LOAN_LIMIT}</dd>
              </dl>
              <Prov kind="rules">the limit of {VISITOR_LOAN_LIMIT} loans and the {duration(params.visitor_window_sec)} window are the desk's visitor rules</Prov>
            </div>
          )}

          {request === undefined ? null : (
            <div className="card side-card">
              <h2 className="section-title">Waiting for a co-signer</h2>
              <p>
                Asked {near(request.amount)}; needs {near(request.gap)} co-signed · {countdown(request.expires_at_ms, clock)} left.
              </p>
              <p className="note"><a href="#/requests">See the request</a></p>
            </div>
          )}
        </aside>
      </div>
      <NamingNote root={root} />
    </>
  );
}
