/** Loan detail (`#/loans/:id`): the proposal chain, the proposal as read from Sputnik, the facts, and this loan's check. */
import type { Deployment } from '../../../../src/lib/deployments';
import { accountUrl } from '../../../../src/lib/deployments';
import type { Snapshot } from '../../data/reads';
import { ago, near, utcDateTime } from '../../data/format';
import { loanCheck } from '../../data/verify';
import { stationsOf } from '../../landing/chain';
import { laneWords, shortAccount, stampWords } from '../../ledger';
import type { ChecksState } from '../../proof/Checks';
import { ChainView } from '../../ui/ChainView';
import { Acct, Id, Stamp } from '../bits';
import { loanHref, memberHref } from '../router';
import { NotFound, Prov } from '../states';
import type { Freshness } from '../states';

function When({ ms, nowMs }: { ms: number; nowMs: number }) {
  if (ms === 0) return <span className="cell-quiet">—</span>;
  return (
    <>
      {utcDateTime(ms)} <span className="cell-quiet">({ms > nowMs ? 'in ' : ''}{ago(Math.abs(nowMs - ms))}{ms > nowMs ? '' : ' ago'})</span>
    </>
  );
}

export function LoanDetailView({ deployment, snap, fresh, id, checks, onRunChecks }: {
  deployment: Deployment;
  snap: Snapshot;
  fresh: Freshness;
  id: number;
  checks: ChecksState;
  onRunChecks: () => void;
}) {
  const ids = snap.desk.loans.map((l) => l.id).sort((a, b) => a - b);
  const loan = snap.desk.loans.find((l) => l.id === id);
  if (loan === undefined) {
    return (
      <NotFound title={`There is no loan #${id}`}>
        <p>{ids.length === 0 ? 'The desk has no loans yet.' : `The desk has ${ids.length} loans, numbered #${ids[0] ?? 0} to #${ids[ids.length - 1] ?? 0}.`}</p>
        <p>
          <a href="#/loans">All loans</a>
        </p>
      </NotFound>
    );
  }
  const root = deployment.root;
  const proposal = loan.proposal_id === null ? undefined : snap.proposals[loan.proposal_id];
  const stations = stationsOf(loan, proposal, { deployment, params: snap.desk.config.params });
  const at = ids.indexOf(loan.id);
  const prev = at > 0 ? ids[at - 1] : undefined;
  const next = at < ids.length - 1 ? ids[at + 1] : undefined;
  const check = checks.phase === 'done' ? loanCheck(checks.run.checks, loan.id) : undefined;
  const proposalText = loan.proposal_id === null ? 'no proposal (refused before filing)' : `#${loan.proposal_id} · ${proposal?.status ?? (snap.proposalErrors.includes(loan.proposal_id) ? 'status unavailable' : 'not read')}`;

  return (
    <>
      <header className="page-head detail-head">
        <p className="crumbs">
          <a href="#/loans">Loans</a> <span aria-hidden="true">/</span> Loan #{loan.id}
        </p>
        <div className="detail-title">
          <h1 className="page-title" data-page-title tabIndex={-1}>Loan #{loan.id}</h1>
          <Stamp status={loan.status} />
        </div>
        <p className="page-sub">
          {laneWords(loan.lane)} lane · {shortAccount(loan.borrower, root)} borrowed {near(loan.principal)}
        </p>
        <nav className="prevnext" aria-label="Other loans">
          {prev === undefined ? <span /> : <a href={loanHref(prev)}>Previous: loan #{prev}</a>}
          <span className="cell-quiet">
            {at + 1} of {ids.length}
          </span>
          {next === undefined ? <span /> : <a href={loanHref(next)}>Next: loan #{next}</a>}
        </nav>
      </header>

      <div className="detail-grid">
        <section className="detail-main" aria-labelledby="chain-h">
          <h2 id="chain-h" className="section-title">The proposal chain</h2>
          <ChainView stations={stations} loanId={loan.id} vertical />
          {proposal === undefined ? null : (
            <details className="raw">
              <summary>Proposal #{proposal.id} as read from Sputnik</summary>
              <pre className="id raw-json">{JSON.stringify(proposal, null, 2)}</pre>
            </details>
          )}
          <Prov kind="live" fresh={fresh}>the desk's loan record and Sputnik's proposal</Prov>
        </section>

        <aside className="detail-side" aria-labelledby="facts-h">
          <div className="card side-card">
            <h2 id="facts-h" className="section-title">Facts</h2>
            <dl className="facts facts-stack">
              <dt>Borrower</dt>
              <dd><a href={memberHref(loan.borrower)}><Acct account={loan.borrower} root={root} /></a></dd>
              <dt>Amount</dt>
              <dd>{near(loan.principal)}</dd>
              <dt>Borrower's own part</dt>
              <dd>{near(loan.borrower_part)}</dd>
              <dt>Co-signer</dt>
              <dd>
                {loan.cosigner === null ? (
                  <span className="cell-quiet">none</span>
                ) : (
                  <>
                    <a href={memberHref(loan.cosigner)}><Acct account={loan.cosigner} root={root} /></a> for {near(loan.pledge)}
                  </>
                )}
              </dd>
              <dt>Lane</dt>
              <dd>{laneWords(loan.lane)}</dd>
              <dt>Status</dt>
              <dd>{stampWords(loan.status)}</dd>
              <dt>Sputnik proposal</dt>
              <dd>{proposalText}</dd>
              <dt>Opened</dt>
              <dd><When ms={loan.created_at_ms} nowMs={fresh.nowMs} /></dd>
              <dt>Due</dt>
              <dd><When ms={loan.due_at_ms} nowMs={fresh.nowMs} /></dd>
              <dt>Closed</dt>
              <dd><When ms={loan.closed_at_ms} nowMs={fresh.nowMs} /></dd>
            </dl>
            <Prov kind="live" fresh={fresh} />
          </div>

          <div className="card side-card" aria-live="polite">
            <h2 className="section-title">This loan's check</h2>
            {check !== undefined ? (
              <ul className="check-list">
                <li className={check.ok ? 'check check-pass' : 'check check-fail'}>
                  <span className="check-mark">{check.ok ? 'PASS' : 'FAIL'}</span>
                  <span className="check-name">{check.name}</span>
                  <span className="check-detail id">{check.detail}</span>
                </li>
              </ul>
            ) : checks.phase === 'running' ? (
              <p role="status">Reading from NEAR testnet: {checks.steps.filter((s) => s.done).length} of {checks.steps.length} reads back</p>
            ) : checks.phase === 'failed' ? (
              <p className="signal">The checks could not run just now. <button type="button" className="link-btn" onClick={onRunChecks}>Retry</button></p>
            ) : (
              <>
                <p className="note">Compares this loan with its Sputnik proposal (kind, receiver, amount, status), with the same code as <code>npm run verify</code>.</p>
                <p>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={onRunChecks}>Run the desk's checks</button>
                </p>
              </>
            )}
          </div>

          <div className="card side-card">
            <h2 className="section-title">On the explorer</h2>
            <ul className="link-list">
              <li><a href={accountUrl(deployment, loan.borrower)}>Borrower <Id>{loan.borrower}</Id></a></li>
              {loan.cosigner === null ? null : <li><a href={accountUrl(deployment, loan.cosigner)}>Co-signer <Id>{loan.cosigner}</Id></a></li>}
              <li><a href={accountUrl(deployment, deployment.dao)}>DAO <Id>{deployment.dao}</Id></a></li>
              <li><a href={accountUrl(deployment, deployment.desk)}>Desk <Id>{deployment.desk}</Id></a></li>
            </ul>
            <p className="note">Fiador reads no transaction hashes (there is no indexer), so these link to the accounts.</p>
          </div>

          {loan.status === 'Active' ? (
            <p className="note">
              To repay it, connect a testnet wallet in the <a href="#/">overview's member panel</a>; it attaches exactly the principal read from this loan.
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
