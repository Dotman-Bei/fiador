/** The board's lists: a table on wide screens, slips under 900px (no sideways scroll on a phone). */
import type { ReactNode } from 'react';
import { Acct, lane, Stamp } from './bits';
import type { LoanRow, MemberRow, WaitingRow } from './data';
import { utcTime } from '../data/format';

function Ref({ href, children }: { href: string | null; children: ReactNode }) {
  return href === null ? <>{children}</> : <a href={href}>{children}</a>;
}

/** When the loan stands: time left while open, else when it closed. */
function when(r: LoanRow): string {
  if (r.statusKey === 'Active') return r.timeLeft === 'expired' ? 'past due' : `${r.timeLeft} left`;
  if (r.closedAtMs > 0) return `closed ${utcTime(r.closedAtMs)}`;
  return '—';
}

function proposalText(r: LoanRow): string {
  if (r.proposalId === null) return 'no proposal';
  return `#${r.proposalId} ${r.proposalStatus ?? 'status unavailable'}`;
}

export function LoanList({
  rows,
  root,
  caption,
  loanHref,
  memberHref,
}: {
  rows: readonly LoanRow[];
  root: string;
  caption: string;
  loanHref: ((id: number) => string) | null;
  memberHref: ((account: string) => string) | null;
}) {
  const lh = (id: number): string | null => (loanHref === null ? null : loanHref(id));
  const mh = (a: string): string | null => (memberHref === null ? null : memberHref(a));
  return (
    <>
      <div className="wide-only">
        <table className="table">
          <caption className="vh">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Loan</th>
              <th scope="col">Borrower</th>
              <th scope="col" className="n">Amount</th>
              <th scope="col">Outcome</th>
              <th scope="col">Lane</th>
              <th scope="col">Sputnik proposal</th>
              <th scope="col">When</th>
              <th scope="col">Co-signer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="cell-id"><Ref href={lh(r.id)}>#{r.id}</Ref></th>
                <td><Ref href={mh(r.borrower)}><Acct account={r.borrower} root={root} /></Ref></td>
                <td className="n">{r.amount}</td>
                <td><Stamp status={r.statusKey} flat /></td>
                <td>{lane(r.laneKey)}</td>
                <td>{proposalText(r)}</td>
                <td className="cell-quiet">{when(r)}</td>
                <td>
                  {r.cosignerAccount === null ? (
                    <span className="cell-quiet">—</span>
                  ) : (
                    <>
                      <Ref href={mh(r.cosignerAccount)}><Acct account={r.cosignerAccount} root={root} /></Ref>
                      <span className="cell-quiet"> for {r.pledge}</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="narrow-only slips" aria-label={caption}>
        {rows.map((r) => (
          <li key={r.id} className="slip">
            <span className="slip-stub"><Ref href={lh(r.id)}>#{r.id}</Ref></span>
            <div className="slip-body">
              <p className="slip-head">
                <span className="slip-who"><Acct account={r.borrower} root={root} /></span>
                <span className="slip-amt">{r.amount}</span>
                <Stamp status={r.statusKey} flat />
              </p>
              <p className="slip-meta">
                {r.cosignerAccount === null ? lane(r.laneKey) : <>Co-signed by <Acct account={r.cosignerAccount} root={root} /> for {r.pledge}</>}
                {' · '}
                {proposalText(r)}
                {' · '}
                {when(r)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function WaitingList({ rows, root, caption, memberHref }: { rows: readonly WaitingRow[]; root: string; caption: string; memberHref: ((a: string) => string) | null }) {
  const mh = (a: string): string | null => (memberHref === null ? null : memberHref(a));
  return (
    <>
      <div className="wide-only">
        <table className="table">
          <caption className="vh">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Borrower</th>
              <th scope="col" className="n">Amount asked</th>
              <th scope="col" className="n">Gap to co-sign</th>
              <th scope="col" className="n">Time left</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.borrower}>
                <th scope="row"><Ref href={mh(r.borrower)}><Acct account={r.borrower} root={root} /></Ref></th>
                <td className="n">{r.amount}</td>
                <td className="n">{r.gap}</td>
                <td className="n">{r.timeLeft}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="narrow-only slips" aria-label={caption}>
        {rows.map((r) => (
          <li key={r.borrower} className="slip">
            <span className="slip-stub" aria-hidden="true">ask</span>
            <div className="slip-body">
              <p className="slip-head">
                <span className="slip-who"><Acct account={r.borrower} root={root} /></span>
                <span className="slip-amt">{r.amount}</span>
              </p>
              <p className="slip-meta">needs {r.gap} co-signed · {r.timeLeft} left</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function MemberList({ rows, root, caption, memberHref, loanHref }: { rows: readonly MemberRow[]; root: string; caption: string; memberHref: ((a: string) => string) | null; loanHref: ((id: number) => string) | null }) {
  const mh = (a: string): string | null => (memberHref === null ? null : memberHref(a));
  const behind = (r: MemberRow): ReactNode =>
    r.behindIds.length === 0 ? (
      <span className="cell-quiet">—</span>
    ) : (
      r.behindIds.map((id, i) => (
        <span key={id}>
          {i > 0 ? ', ' : null}
          <Ref href={loanHref === null ? null : loanHref(id)}>#{id}</Ref>
        </span>
      ))
    );
  return (
    <>
      <div className="wide-only">
        <table className="table">
          <caption className="vh">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Kind</th>
              <th scope="col" className="n">Standing</th>
              <th scope="col" className="n">Unused</th>
              <th scope="col" className="n">Drawn</th>
              <th scope="col" className="n">Pledged</th>
              <th scope="col" className="n">On time</th>
              <th scope="col" className="n">Defaults</th>
              <th scope="col">Repaid loans behind the standing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.account}>
                <th scope="row"><Ref href={mh(r.account)}><Acct account={r.account} root={root} /></Ref></th>
                <td>{r.kind}</td>
                <td className="n">{r.standing}</td>
                <td className="n">{r.unused}</td>
                <td className="n">{r.drawn}</td>
                <td className="n">{r.pledged}</td>
                <td className="n">{r.repaidOnTime}</td>
                <td className="n">{r.defaults}</td>
                <td>{behind(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="narrow-only slips" aria-label={caption}>
        {rows.map((r) => (
          <li key={r.account} className="slip">
            <span className="slip-stub" aria-hidden="true">{r.kind === 'visitor' ? 'vis.' : 'mbr.'}</span>
            <div className="slip-body">
              <p className="slip-head">
                <span className="slip-who"><Ref href={mh(r.account)}><Acct account={r.account} root={root} /></Ref></span>
                <span className="slip-amt">{r.standing}</span>
              </p>
              <p className="slip-meta">
                {r.kind} · unused {r.unused} · drawn {r.drawn} · pledged {r.pledged} · repaid behind it: {behind(r)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
