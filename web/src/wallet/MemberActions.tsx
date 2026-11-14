/**
 * Wallet-connected member actions for /app (ask, co-sign, repay). Optional; the board stays read-only without it.
 * Ask, repay and cancel were run end to end with Meteor Wallet on testnet on 2026-11-14 (co-sign was not; see
 * docs/design/ACCEPTANCE_EVIDENCE.md, "Wallet run"). It claims no transaction state it did not read: after the wallet
 * returns it gives the transaction hash if the wallet returned one, and the board shows the result once the desk records it.
 */
import { useEffect, useState } from 'react';
import type { LoanView } from '../../../src/lib/desk';
import type { Deployment } from '../../../src/lib/deployments';
import { formatNear } from '../../../src/lib/units';
import { shortAccount } from '../ledger';
import { askCall, cancelCall, cosignCall, repayCall } from './actions';
import type { CallSpec } from './actions';
import { errorStatus, openingStatus, sentStatus, SLOW_WALLET_MS, slowStatus, txHash, txUrl } from './status';
import { currentAccount, send, signIn, signOut } from './wallet';
import type { WalletId } from './wallet';

/** The two testnet wallets, said plainly: MyNearWallet no longer creates accounts. */
export function WalletChooser({ onChoose, busy = false }: { onChoose: (walletId: WalletId) => void; busy?: boolean }) {
  return (
    <p className="act-connect">
      <button type="button" className="btn" disabled={busy} onClick={() => onChoose('meteor-wallet')}>Connect with Meteor Wallet</button>
      <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => onChoose('my-near-wallet')}>Connect with MyNearWallet (existing accounts only)</button>
    </p>
  );
}

const WALLET_NAME: Record<WalletId, string> = { 'meteor-wallet': 'Meteor Wallet', 'my-near-wallet': 'MyNearWallet' };

export function MemberActions({ deployment, loans = [] }: { deployment: Deployment | null; loans?: readonly LoanView[] }) {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [askAmount, setAskAmount] = useState('1');
  const [borrower, setBorrower] = useState('');
  const [maxPledge, setMaxPledge] = useState('1');
  const [loanId, setLoanId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [tx, setTx] = useState<string | null>(null);

  useEffect(() => {
    currentAccount()
      .then(setAccount)
      .catch((e: unknown) => setStatus(e instanceof Error ? e.message : String(e)));
  }, []);

  if (deployment === null) return null;
  const desk = deployment.desk;
  const open = loans.filter((l) => l.status === 'Active');
  const chosen = open.find((l) => String(l.id) === loanId) ?? open[0];
  const connect = (walletId: WalletId): void => {
    setConnecting(true);
    setStatus(`Opening ${WALLET_NAME[walletId]}…`);
    signIn(desk, walletId)
      .then((id) => {
        setAccount(id);
        setStatus(id === null ? `${WALLET_NAME[walletId]} returned without an account.` : '');
      })
      .catch((e: unknown) => setStatus(`${WALLET_NAME[walletId]} did not sign in: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => setConnecting(false));
  };
  const run = (build: () => CallSpec): void => {
    try {
      const spec = build();
      setTx(null);
      setStatus(openingStatus(spec.methodName));
      let settled = false;
      const slow = setTimeout(() => {
        if (!settled) setStatus(slowStatus(spec.methodName));
      }, SLOW_WALLET_MS);
      send(desk, spec)
        .then((outcome) => {
          setStatus(sentStatus(spec.methodName, outcome));
          setTx(txHash(outcome));
        })
        .catch((e: unknown) => setStatus(errorStatus(spec.methodName, e)))
        .finally(() => {
          settled = true;
          clearTimeout(slow);
        });
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
          <WalletChooser busy={connecting} onChoose={connect} />
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
        <p role="status" className="act-status">
          {status}
          {tx === null ? null : (
            <>
              {' '}
              <a href={txUrl(deployment.explorer, tx)} target="_blank" rel="noreferrer">View the transaction</a>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
