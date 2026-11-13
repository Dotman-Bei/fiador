/** /app — the public read-only board. Styled from docs/design/direction.md (Passbook): ledger tables, stamped statuses. */
import { useEffect, useState } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import { accountUrl } from '../../../src/lib/deployments';
import { OPEN_STATUSES } from '../../../src/lib/desk';
import { RpcClient } from '../../../src/lib/rpc';
import { loadBoard, loanRows, memberRows, near, waitingRows } from './data';
import type { BoardData, LoanRow, MemberRow, WaitingRow } from './data';

const POLL_MS = 5_000;

export type Tone = 'ok' | 'open' | 'bad' | 'quiet';

/** The stamp color for a loan status: repaid, still open, defaulted, or closed without effect. */
export function statusTone(status: string): Tone {
  if (status === 'Repaid') return 'ok';
  if (status === 'Defaulted') return 'bad';
  if ((OPEN_STATUSES as readonly string[]).includes(status)) return 'open';
  return 'quiet';
}

export function WaitingTable({ rows }: { rows: readonly WaitingRow[] }) {
  return (
    <section aria-labelledby="waiting" className="book">
      <h2 id="waiting">Waiting for a co-signer</h2>
      {rows.length === 0 ? (
        <p>No request is waiting for a co-signer.</p>
      ) : (
        <div className="scroll">
          <table className="ledger">
            <thead>
              <tr><th>Borrower</th><th className="n">Amount</th><th className="n">Gap to co-sign</th><th className="n">Time left</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.borrower}><td>{r.borrower}</td><td className="n">{r.amount}</td><td className="n">{r.gap}</td><td className="n tone-open">{r.timeLeft}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function LoanBook({ rows }: { rows: readonly LoanRow[] }) {
  return (
    <section aria-labelledby="book" className="book">
      <h2 id="book">Loan book</h2>
      {rows.length === 0 ? (
        <p>No loans yet.</p>
      ) : (
        <div className="scroll">
          <table className="ledger">
            <thead>
              <tr><th>Loan</th><th>Lane</th><th>Borrower</th><th>Co-signer</th><th className="n">Amount</th><th>Status</th><th className="n">Time left</th><th>Sputnik proposal</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td><td>{r.lane}</td><td>{r.borrower}</td><td>{r.cosigner}</td><td className="n">{r.amount}</td>
                  <td><span className={`stamp tone-${statusTone(r.status)}`}>{r.status}</span></td>
                  <td className="n">{r.timeLeft}</td><td className="nowrap">{r.proposal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MembersTable({ rows }: { rows: readonly MemberRow[] }) {
  return (
    <section aria-labelledby="members" className="book">
      <h2 id="members">Members</h2>
      {rows.length === 0 ? (
        <p>No members yet.</p>
      ) : (
        <div className="scroll">
          <table className="ledger">
            <thead>
              <tr><th>Account</th><th>Kind</th><th className="n">Standing</th><th className="n">Unused</th><th className="n">Drawn</th><th className="n">Pledged</th><th>Repaid loans behind the standing</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.account}>
                  <td>{r.account}</td><td>{r.kind}</td><td className="n">{r.standing}</td><td className="n">{r.unused}</td><td className="n">{r.drawn}</td><td className="n">{r.pledged}</td><td>{r.behind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function BoardView({ deployment, data, nowMs }: { deployment: Deployment; data: BoardData; nowMs: number }) {
  const p = data.snapshot.config.params;
  return (
    <main className="board wrap">
      <header className="board-head">
        <h1>Fiador board</h1>
        <p>
          Live, read-only view of the demo credit union on NEAR testnet. DAO <a href={accountUrl(deployment, deployment.dao)}>{deployment.dao}</a>, desk{' '}
          <a href={accountUrl(deployment, deployment.desk)}>{deployment.desk}</a>.
        </p>
      </header>
      <div className="summary">
        <section aria-labelledby="treasury">
          <h2 id="treasury">Treasury</h2>
          <dl className="figures">
            <div><dt>Balance</dt><dd>{near(data.treasury.balance)}</dd></div>
            <div><dt>Available to lend</dt><dd>{near(data.treasury.available)}</dd></div>
            <div><dt>Out on loan (book)</dt><dd className="small">{near(data.snapshot.config.book)} of {near(p.book_cap)} cap</dd></div>
          </dl>
        </section>
        <section aria-labelledby="desk">
          <h2 id="desk">Desk</h2>
          <dl className="facts">
            <dt>Seated in the DAO policy</dt><dd className={data.seated ? 'tone-ok' : 'tone-bad'}>{data.seated ? 'yes' : 'no (unseated by the council)'}</dd>
            <dt>Keyless (frozen)</dt><dd className={data.frozen ? 'tone-ok' : 'tone-open'}>{data.frozen ? 'yes: no access keys, so no admin and no upgrade' : 'not yet'}</dd>
            <dt>Starter standing</dt><dd>{near(p.starter_standing)}</dd>
            <dt>Maximum standing</dt><dd>{near(p.max_standing)}</dd>
            <dt>Growth per on-time repayment</dt><dd>up to {near(p.growth_step)}</dd>
            <dt>Loan term / grace</dt><dd>{p.loan_term_sec} s / {p.grace_sec} s</dd>
          </dl>
        </section>
      </div>
      <WaitingTable rows={waitingRows(data.snapshot.requests, nowMs)} />
      <LoanBook rows={loanRows(data.snapshot.loans, data.proposals, nowMs)} />
      <MembersTable rows={memberRows(data.snapshot.members, data.snapshot.loans)} />
      <footer className="readout">
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
      <main className="board wrap">
        <header className="board-head">
          <h1>Fiador board</h1>
        </header>
        <p className="notice">The demo DAO has not been seeded in this build (deployments/testnet.json is missing).</p>
      </main>
    );
  }
  if (data === null) {
    return (
      <main className="board wrap">
        <header className="board-head">
          <h1>Fiador board</h1>
        </header>
        <p className="notice">{error === null ? 'Reading the DAO and the desk from public RPC…' : `Could not read testnet: ${error}`}</p>
      </main>
    );
  }
  return <BoardView deployment={deployment} data={data} nowMs={nowMs} />;
}
