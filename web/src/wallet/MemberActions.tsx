/** Wallet-connected member actions for /app (ask, co-sign, repay). Optional; the board stays read-only without it. Styled from docs/design/direction.md. */
import { useEffect, useState } from 'react';
import type { Deployment } from '../../../src/lib/deployments';
import { askCall, cancelCall, cosignCall, repayCall } from './actions';
import type { CallSpec } from './actions';
import { currentAccount, send, signIn, signOut } from './wallet';

export function MemberActions({ deployment }: { deployment: Deployment | null }) {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [askAmount, setAskAmount] = useState('1');
  const [borrower, setBorrower] = useState('');
  const [maxPledge, setMaxPledge] = useState('1');
  const [loanId, setLoanId] = useState('');
  const [principal, setPrincipal] = useState('');

  useEffect(() => {
    currentAccount()
      .then(setAccount)
      .catch((e: unknown) => setStatus(e instanceof Error ? e.message : String(e)));
  }, []);

  if (deployment === null) return null;
  const desk = deployment.desk;
  const run = (build: () => CallSpec): void => {
    try {
      const spec = build();
      setStatus(`Sending ${spec.methodName}…`);
      send(desk, spec)
        .then(() => setStatus(`${spec.methodName} sent; the board updates within 5 seconds.`))
        .catch((e: unknown) => setStatus(`${spec.methodName} failed: ${e instanceof Error ? e.message : String(e)}`));
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
              <form className="act-form" onSubmit={(e) => { e.preventDefault(); run(() => repayCall(Number(loanId), principal)); }}>
                <label>Repay loan # <input value={loanId} onChange={(e) => setLoanId(e.target.value)} inputMode="numeric" /></label>
                <label>Principal (yocto, from the loan book) <input value={principal} onChange={(e) => setPrincipal(e.target.value)} inputMode="numeric" /></label>
                <p className="row">
                  <button type="submit" className="btn">Repay</button>
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
