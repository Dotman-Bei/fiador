/** The hero moment: the member passbook, its ruled page carrying the first loans on the desk, read live from NEAR testnet. */
import { useEffect, useState } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import type { ConfigView, LoanView } from '../../../src/lib/desk';
import { RpcClient } from '../../../src/lib/rpc';
import { formatNear } from '../../../src/lib/units';
import { shortAccount, stampInk, stampWords } from '../ledger';

/** Lines on one page of the passbook. */
export const PAGE_LINES = 6;

export interface PassbookData {
  loans: LoanView[];
  total: number;
}

export async function loadPassbook(rpc: RpcClient, desk: string): Promise<PassbookData> {
  const config = await rpc.view<ConfigView>(desk, 'get_config');
  const loans = await rpc.view<LoanView[]>(desk, 'get_loans', { from_index: 0, limit: PAGE_LINES });
  return { loans, total: config.loan_count };
}

/** The second line of an entry: how the loan was approved, and who co-signed. */
export function entryDetail(loan: LoanView, root: string): string {
  if (loan.lane === 'Cosigned' && loan.cosigner !== null) return `co-signed by ${shortAccount(loan.cosigner, root)} for ${formatNear(loan.pledge)} NEAR`;
  return loan.lane === 'Council' ? 'council vote' : 'within standing';
}

/** The Sputnik proposal that paid the loan, or that none was filed. */
export function proposalWords(loan: LoanView): string {
  return loan.proposal_id === null ? 'no proposal' : `proposal #${loan.proposal_id}`;
}

export function PassbookView({ deployment, data, error }: { deployment: Deployment | null; data: PassbookData | null; error: string | null }) {
  const root = deployment?.root ?? '';
  const last = data === null || data.loans.length === 0 ? null : data.loans[data.loans.length - 1];
  return (
    <figure className="passbook" aria-label="The Fiador member passbook: the first loans on the demo DAO, read live from NEAR testnet">
      <div className="pb-cover">
        <div className="pb-spread">
          <div className="pb-page pb-left">
            <p className="pb-mark">Fiador</p>
            <p className="pb-kind">Member loan book</p>
            <p className="pb-note">One line per loan, stamped when it closed.</p>
          </div>
          <div className="pb-page pb-right">
            <table className="pb-table">
              <thead>
                <tr>
                  <th className="pb-no">No.</th>
                  <th>Member</th>
                  <th className="n">Amount</th>
                  <th className="pb-out">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {(data?.loans ?? []).map((loan) => (
                  <tr key={loan.id}>
                    <td className="pb-no">#{loan.id}</td>
                    <td className="pb-entry">
                      <span className="pb-who" title={loan.borrower}>{shortAccount(loan.borrower, root)}</span>
                      <span className="pb-how">{entryDetail(loan, root)}</span>
                    </td>
                    <td className="n pb-amt">
                      <span className="pb-sum">{formatNear(loan.principal)} NEAR</span>
                      <span className="pb-prop">{proposalWords(loan)}</span>
                    </td>
                    <td className="pb-out">
                      <span className={`stamp ink-${stampInk(loan.status)}`}>{stampWords(loan.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pb-foot">
              {deployment === null
                ? 'The demo DAO has not been seeded in this build.'
                : error !== null
                  ? 'Could not read NEAR testnet just now. The board has the full book.'
                  : data === null
                    ? 'Reading the loan book from NEAR testnet…'
                    : last === null
                      ? 'No loans yet.'
                      : `Loans #0 to #${last.id} of ${data.total}, read live from NEAR testnet.${root === '' ? '' : ` Accounts under ${root} are shown by their first label.`}`}
              {deployment === null ? null : (
                <>
                  {' '}
                  <a href="./app/">Full book on the board</a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}

export function Passbook({ deployment }: { deployment: Deployment | null }) {
  const [data, setData] = useState<PassbookData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deployment === null) return undefined;
    let alive = true;
    loadPassbook(new RpcClient(deployment.rpc), deployment.desk)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [deployment]);

  return <PassbookView deployment={deployment} data={data} error={error} />;
}
