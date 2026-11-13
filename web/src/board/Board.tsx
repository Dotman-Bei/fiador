/** /app — the public read-only board. Structural markup only: the Design pass styles it from docs/design/direction.md. */
import { useEffect, useState } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import { accountUrl } from '../../../src/lib/deployments';
import { RpcClient } from '../../../src/lib/rpc';
import { loadBoard, loanRows, memberRows, near, waitingRows } from './data';
import type { BoardData, LoanRow, MemberRow, WaitingRow } from './data';

const POLL_MS = 5_000;

export function WaitingTable({ rows }: { rows: readonly WaitingRow[] }) {
  return (
    <section aria-labelledby="waiting">
      <h2 id="waiting">Waiting for a co-signer</h2>
      {rows.length === 0 ? (
        <p>No request is waiting for a co-signer.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Borrower</th><th>Amount</th><th>Gap to co-sign</th><th>Time left</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.borrower}><td>{r.borrower}</td><td>{r.amount}</td><td>{r.gap}</td><td>{r.timeLeft}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function LoanBook({ rows }: { rows: readonly LoanRow[] }) {
  return (
    <section aria-labelledby="book">
      <h2 id="book">Loan book</h2>
      {rows.length === 0 ? (
        <p>No loans yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Loan</th><th>Lane</th><th>Borrower</th><th>Co-signer</th><th>Amount</th><th>Status</th><th>Time left</th><th>Sputnik proposal</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>#{r.id}</td><td>{r.lane}</td><td>{r.borrower}</td><td>{r.cosigner}</td><td>{r.amount}</td><td>{r.status}</td><td>{r.timeLeft}</td><td>{r.proposal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function MembersTable({ rows }: { rows: readonly MemberRow[] }) {
  return (
    <section aria-labelledby="members">
      <h2 id="members">Members</h2>
      {rows.length === 0 ? (
        <p>No members yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Account</th><th>Kind</th><th>Standing</th><th>Unused</th><th>Drawn</th><th>Pledged</th><th>Repaid loans behind the standing</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.account}>
                <td>{r.account}</td><td>{r.kind}</td><td>{r.standing}</td><td>{r.unused}</td><td>{r.drawn}</td><td>{r.pledged}</td><td>{r.behind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function BoardView({ deployment, data, nowMs }: { deployment: Deployment; data: BoardData; nowMs: number }) {
  const p = data.snapshot.config.params;
  return (
    <main>
      <header>
        <h1>Fiador board</h1>
        <p>
          Live, read-only view of the demo credit union on NEAR testnet. DAO <a href={accountUrl(deployment, deployment.dao)}>{deployment.dao}</a>, desk{' '}
          <a href={accountUrl(deployment, deployment.desk)}>{deployment.desk}</a>.
        </p>
      </header>
      <section aria-labelledby="treasury">
        <h2 id="treasury">Treasury</h2>
        <dl>
          <dt>Balance</dt><dd>{near(data.treasury.balance)}</dd>
          <dt>Available to lend</dt><dd>{near(data.treasury.available)}</dd>
          <dt>Out on loan (book)</dt><dd>{near(data.snapshot.config.book)} of {near(p.book_cap)} cap</dd>
        </dl>
      </section>
      <section aria-labelledby="desk">
        <h2 id="desk">Desk</h2>
        <dl>
          <dt>Seated in the DAO policy</dt><dd>{data.seated ? 'yes' : 'no (unseated by the council)'}</dd>
          <dt>Keyless (frozen)</dt><dd>{data.frozen ? 'yes: no access keys, so no admin and no upgrade' : 'not yet'}</dd>
          <dt>Starter standing</dt><dd>{near(p.starter_standing)}</dd>
          <dt>Maximum standing</dt><dd>{near(p.max_standing)}</dd>
          <dt>Growth per on-time repayment</dt><dd>up to {near(p.growth_step)}</dd>
          <dt>Loan term / grace</dt><dd>{p.loan_term_sec} s / {p.grace_sec} s</dd>
        </dl>
      </section>
      <WaitingTable rows={waitingRows(data.snapshot.requests, nowMs)} />
      <LoanBook rows={loanRows(data.snapshot.loans, data.proposals, nowMs)} />
      <MembersTable rows={memberRows(data.snapshot.members, data.snapshot.loans)} />
      <footer>
        <p>Last read {new Date(data.loadedAtMs).toISOString()} from {deployment.rpc}. Re-reads every 5 seconds.</p>
      </footer>
    </main>
  );
}

export function Board({ deployment }: { deployment: Deployment | null }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (deployment === null) return undefined;
    const rpc = new RpcClient(deployment.rpc);
    let alive = true;
    const tick = (): void => {
      const now = Date.now();
      loadBoard(rpc, deployment, now)
        .then((d) => {
          if (alive) {
            setData(d);
            setError(null);
            setNowMs(now);
          }
        })
        .catch((e: unknown) => {
          if (alive) setError(e instanceof Error ? e.message : String(e));
        });
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [deployment]);

  if (deployment === null) {
    return (
      <main>
        <h1>Fiador board</h1>
        <p>The demo DAO has not been seeded in this build (deployments/testnet.json is missing).</p>
      </main>
    );
  }
  if (data === null) {
    return (
      <main>
        <h1>Fiador board</h1>
        <p>{error === null ? 'Reading the DAO and the desk from public RPC…' : `Could not read testnet: ${error}`}</p>
      </main>
    );
  }
  return <BoardView deployment={deployment} data={data} nowMs={nowMs} />;
}
