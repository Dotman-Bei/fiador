/**
 * Wallet-connected member actions for /app (ask, co-sign, repay). Optional; the board stays read-only without it.
 * Never exercised end to end with a real wallet, and it claims no transaction state it did not read: after the wallet
 * returns it says only that, and the board shows the result once the desk records it.
 */
import { useEffect, useState } from 'react';
import type { LoanView } from '../../../src/lib/desk';
import type { Deployment } from '../../../src/lib/deployments';
import { formatNear } from '../../../src/lib/units';
import { shortAccount } from '../ledger';
import { askCall, cancelCall, cosignCall, repayCall } from './actions';
import type { CallSpec } from './actions';
import { currentAccount, send, signIn, signOut } from './wallet';

export function MemberActions({ deployment, loans = [] }: { deployment: Deployment | null; loans?: readonly LoanView[] }) {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [askAmount, setAskAmount] = useState('1');
  const [borrower, setBorrower] = useState('');
  const [maxPledge, setMaxPledge] = useState('1');
  const [loanId, setLoanId] = useState('');

  useEffect(() => {
    currentAccount()
      .then(setAccount)
      .catch((e: unknown) => setStatus(e instanceof Error ? e.message : String(e)));
  }, []);

  if (deployment === null) return null;
  const desk = deployment.desk;
  const open = loans.filter((l) => l.status === 'Active');
  const chosen = open.find((l) => String(l.id) === loanId) ?? open[0];
  const run = (build: () => CallSpec): void => {
    try {
      const spec = build();
      setStatus(`Opening your wallet for ${spec.methodName}…`);
      send(desk, spec)
        .then(() => setStatus(`Your wallet returned from ${spec.methodName}. Fiador has not read the result; the board shows it once the desk records it.`))
        .catch((e: unknown) => setStatus(`The wallet reported an error for ${spec.methodName}: ${e instanceof Error ? e.message : String(e)}`));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section aria-labelledby="act" className="act block">
      <div className="card act-panel">
        <h2 id="act">Act as a member (testnet wallet)</h2>
        <p className="act-intro">Optional. Members admitted by the council can ask, co-sign and repay here. Everything on the board above works without a wallet.</p>
        {account === null ? (
          <p className="act-connect">
            <button type="button" className="btn" onClick={() => void signIn(desk)}>Connect a testnet wallet</button>
          </p>
        ) : (
          <>
            <p className="act-account">
              Signed in as {account}. <button type="button" className="btn btn-quiet btn-sm" onClick={() => void signOut().then(() => setAccount(null))}>Sign out</button>
            </p>
            <div className="act-forms">
              <form className="act-form" onSubmit={(e) => { e.preventDefault(); run(() => askCall(askAmount)); }}>
                <label>Ask for (NEAR) <input value={askAmount} onChange={(e) => setAskAmount(e.target.value)} inputMode="decimal" /></label>
                <p className="row">
                  <button type="submit" className="btn">Ask</button>
                  <button type="button" className="btn btn-quiet" onClick={() => run(cancelCall)}>Cancel my request</button>
                </p>
              </form>
              <form className="act-form" onSubmit={(e) => { e.preventDefault(); run(() => cosignCall(borrower, maxPledge)); }}>
                <label>Co-sign for (account) <input value={borrower} onChange={(e) => setBorrower(e.target.value)} /></label>
                <label>Pledge up to (NEAR) <input value={maxPledge} onChange={(e) => setMaxPledge(e.target.value)} inputMode="decimal" /></label>
                <p className="row">
                  <button type="submit" className="btn">Co-sign</button>
                </p>
              </form>
              <form
                className="act-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chosen !== undefined) run(() => repayCall(chosen.id, chosen.principal));
                }}
              >
                {open.length === 0 ? (
                  <p className="act-intro">No loan is open, so there is nothing to repay.</p>
                ) : (
                  <>
                    <label>
                      Repay loan
                      <select value={String(chosen?.id ?? '')} onChange={(e) => setLoanId(e.target.value)}>
                        {open.map((l) => (
                          <option key={l.id} value={String(l.id)}>
                            #{l.id} · {shortAccount(l.borrower, deployment.root)} · {formatNear(l.principal)} NEAR
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="act-intro">
                      Attaches exactly the principal, read from the loan: <output>{chosen === undefined ? '' : `${formatNear(chosen.principal)} NEAR`}</output>
                    </p>
                  </>
                )}
                <p className="row">
                  <button type="submit" className="btn" disabled={chosen === undefined}>Repay</button>
                </p>
              </form>
            </div>
          </>
        )}
        <p role="status" className="act-status">{status}</p>
      </div>
    </section>
  );
}
